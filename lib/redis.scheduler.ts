import Task, { TaskRule } from './task';
import { decodeTask, encodeTask, isExpiredRule, nextYearOccurrence, RedisTaskDefinition, StoredRedisTask } from './redis.codec';
import { RedisLeaseLostError, RedisStore, SchedulerRedisClient } from './redis.store';

export interface RedisSchedulerOptions {
  client: SchedulerRedisClient;
  namespace: string;
  handlers: Readonly<Record<string, () => unknown>>;
  leaseMs?: number;
  /** Called if Redis ownership or the outcome of a storage operation becomes uncertain. */
  onError?: (error: Error) => void;
}

interface LocalTask {
  definition: StoredRedisTask;
  encoded: string;
  task: Task;
}

class RedisTask extends Task {
  constructor(definition: StoredRedisTask, handler: () => unknown, admit: () => Promise<boolean>) {
    super(definition.name, definition.rule, handler, definition.options);
    this.admitInvocation = admit;
  }
}

function nextSchedule(rule: TaskRule, now: number) {
  // A finite collection of years has no terminating search in node-schedule 2.x.
  const date = nextYearOccurrence(rule, now);
  if (date !== undefined) return { rule: date, advance: true };
  return { rule: isExpiredRule(rule, now) ? null : rule, advance: false };
}

/** An opt-in, single-owner scheduler. The application owns the Redis connection. */
export class RedisScheduler {
  private readonly tasks = new Map<string, LocalTask>();
  private readonly retiring = new Set<Promise<void>>();
  private readonly handlers: Map<string, () => unknown>;
  private readonly store: RedisStore;
  private readonly leaseMs: number;
  private heartbeat?: NodeJS.Timeout;
  private fault?: Error;
  private tail: Promise<void> = Promise.resolve();
  private closing?: Promise<void>;

  private constructor(private readonly options: RedisSchedulerOptions) {
    this.handlers = new Map(Object.entries(options.handlers));
    if ([...this.handlers.values()].some(handler => typeof handler !== 'function')) {
      throw new TypeError('[Scheduler]Expected functions in the Redis handler registry');
    }
    this.store = new RedisStore(options.client, options.namespace);
    this.leaseMs = options.leaseMs ?? 30000;
    if (!Number.isSafeInteger(this.leaseMs) || this.leaseMs < 1000 || this.leaseMs > 2147483647) {
      throw new RangeError('leaseMs must be an integer between 1000 and 2147483647');
    }
  }

  static async open(options: RedisSchedulerOptions): Promise<RedisScheduler> {
    const manager = new RedisScheduler(options);
    if (!await manager.store.acquire(manager.leaseMs)) {
      throw new Error(`[Scheduler]Redis namespace "${options.namespace}" already has an active scheduler`);
    }
    try {
      manager.renewLease();
      const records = await manager.store.load();
      for (const [name, encoded] of records) {
        const definition = decodeTask(encoded);
        if (definition.name !== name) throw new Error('[Scheduler]Redis task field and name disagree');
        manager.tasks.set(name, manager.localTask(definition, encoded));
      }
      manager.ensureHealthy();
      for (const entry of manager.tasks.values()) manager.arm(entry);
      return manager;
    } catch (error) {
      // An unavailable Redis connection will let the lease expire on its own.
      await manager.close().catch(() => {});
      throw error;
    }
  }

  private ensureHealthy() {
    if (this.fault) throw this.fault;
  }

  private renewLease() {
    this.heartbeat = setTimeout(async () => {
      try {
        if (!await this.store.renew(this.leaseMs)) throw new RedisLeaseLostError();
        if (this.heartbeat && !this.fault) this.renewLease();
      } catch (error) {
        if (this.heartbeat) this.fail(error);
      }
    }, Math.floor(this.leaseMs / 3));
    this.heartbeat.unref();
  }

  private stopHeartbeat() {
    if (this.heartbeat) clearTimeout(this.heartbeat);
    this.heartbeat = undefined;
  }

  private fail(reason: unknown) {
    if (this.fault) return;
    this.fault = reason instanceof Error ? reason : new Error(String(reason));
    this.stopHeartbeat();
    for (const { task } of this.tasks.values()) task.stop();
    const error = this.fault;
    const onError = this.options.onError;
    if (onError) {
      void Promise.resolve().then(() => onError(error)).catch(err => console.error('[Scheduler]onError failed:', err));
    } else console.error('[Scheduler]Redis scheduling suspended:', error.message);
  }

  private localTask(definition: StoredRedisTask, encoded: string, previous?: LocalTask): LocalTask {
    const handler = this.handlers.get(definition.handler);
    if (!handler) throw new Error(`[Scheduler]Missing Redis handler "${definition.handler}" for "${definition.name}"`);
    const task: Task = previous?.task ?? new RedisTask(definition, handler, () => this.admit(definition.name, task));
    return { definition, encoded, task };
  }

  private async admit(name: string, task: Task): Promise<boolean> {
    const entry = this.tasks.get(name);
    if (!entry || entry.task !== task || this.closing || this.fault) return false;
    // Serialize the authorization with command writes, without holding the queue during business work.
    return this.enqueue(async () => {
      if (this.tasks.get(name) !== entry || !entry.definition.enabled || this.closing) return false;
      try {
        if (!await this.store.permits(name, entry.encoded)) throw new RedisLeaseLostError();
      } catch (error) {
        this.fail(error);
        throw error;
      }
      return !this.closing && !this.fault;
    });
  }

  private enqueue<T>(work: () => Promise<T>): Promise<T> {
    if (this.closing) return Promise.reject(new Error('[Scheduler]Redis scheduler is closing or closed'));
    const result = this.tail.then(() => { this.ensureHealthy(); return work(); });
    this.tail = result.then(() => {}, () => {});
    return result;
  }

  private requireTask(name: string) {
    const entry = this.tasks.get(name);
    if (!entry) throw new Error(`[Scheduler]Unknown Redis task "${name}"`);
    return entry;
  }

  private arm(entry: LocalTask, now = Date.now()) {
    const { definition, task } = entry;
    const next = definition.enabled ? nextSchedule(definition.rule, now) : undefined;
    if (!next || next.rule === null) {
      task.stop();
      return;
    }
    task.reschedule(next.rule);
    if (next.advance && next.rule instanceof Date) {
      const due = next.rule.getTime();
      task.job.once('run', () => {
        if (this.closing || this.fault || this.tasks.get(definition.name) !== entry) return;
        try { this.arm(entry, Math.max(Date.now(), due)); }
        catch (error) { this.fail(error); }
      });
    }
  }

  /** Detached configuration snapshot. enabled is the durable intent, scheduled is the local timer state. */
  getTask(name: string): (StoredRedisTask & { scheduled: boolean }) | undefined {
    const entry = this.tasks.get(name);
    if (entry) return { ...decodeTask(entry.encoded), scheduled: entry.task.alive };
    return undefined;
  }

  listTasks() {
    return [...this.tasks.keys()].map(name => this.getTask(name)!);
  }

  getHistory(name: string) {
    const { task } = this.requireTask(name);
    return { count: task.count.slice(), success: task.success.slice(), fail: task.fail.slice() };
  }

  private async persist(name: string, previous: LocalTask | undefined, next: string | null) {
    try {
      await this.store.write(name, previous?.encoded ?? null, next);
      this.ensureHealthy();
    } catch (error) {
      // A disconnected client can lose the reply after Redis has committed.
      this.fail(error);
      throw error;
    }
  }

  private async save(definition: StoredRedisTask, previous?: LocalTask) {
    const encoded = encodeTask(definition);
    const owned = decodeTask(encoded);
    const entry = this.localTask(owned, encoded, previous);
    if (owned.enabled) {
      const preview = nextSchedule(decodeTask(encoded).rule, Date.now());
      if (preview.rule === null) throw new Error(`[Scheduler]Redis task "${owned.name}" has no future invocation`);
      // Validate against the real scheduler before changing the durable record.
      // This probe is canceled synchronously, before timers can run.
      const probe = new Task(owned.name, preview.rule, () => {});
      try { probe.start(); } finally { probe.stop(); }
    }
    await this.persist(owned.name, previous, encoded);
    this.tasks.set(owned.name, entry);
    try {
      this.arm(entry);
    } catch (error) {
      // The store is authoritative even if local activation fails.
      this.fail(error);
      throw error;
    }
  }

  addTask(definition: RedisTaskDefinition, start = false): Promise<void> {
    return this.enqueue(async () => {
      if (this.tasks.has(definition.name)) throw new Error(`[Scheduler]Duplicate Redis task "${definition.name}"`);
      await this.save({ ...definition, enabled: start });
    });
  }

  startTask(name: string): Promise<void> {
    return this.enqueue(async () => {
      const entry = this.requireTask(name);
      if (!entry.definition.enabled) await this.save({ ...entry.definition, enabled: true }, entry);
    });
  }

  stopTask(name: string): Promise<void> {
    return this.enqueue(async () => {
      const entry = this.requireTask(name);
      if (entry.definition.enabled) await this.save({ ...entry.definition, enabled: false }, entry);
    });
  }

  rescheduleTask(name: string, rule: TaskRule): Promise<void> {
    return this.enqueue(async () => {
      const entry = this.requireTask(name);
      await this.save({ ...entry.definition, rule, enabled: true }, entry);
    });
  }

  removeTask(name: string): Promise<void> {
    return this.enqueue(async () => {
      const entry = this.requireTask(name);
      await this.persist(name, entry, null);
      this.tasks.delete(name);
      entry.task.stop();
      if (entry.task.runningCount) {
        const done = entry.task.waitForIdle();
        this.retiring.add(done);
        void done.then(() => this.retiring.delete(done));
      }
    });
  }

  /** Stop locally, drain callbacks and release ownership. Persisted enablement survives close. */
  close(): Promise<void> {
    if (!this.closing) this.closing = this.shutdown();
    return this.closing;
  }

  private async shutdown() {
    await this.tail;
    const pending = [...this.retiring];
    for (const { task } of this.tasks.values()) {
      task.stop();
      pending.push(task.waitForIdle());
    }
    await Promise.all(pending);
    this.stopHeartbeat();
    await this.store.release();
  }
}
