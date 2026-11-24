import { Job, scheduleJob } from 'node-schedule';
import { TaskOption } from './task.option';
import { forgetCache, scheduleCacheRelease } from './task.cache';

export type TaskRule = Parameters<typeof scheduleJob>[0];
export type TaskRef = string | Task;
export type RescheduleRequest = TaskRef | { task: TaskRef; rule?: TaskRule | null };

export function unpackSchedule(request: RescheduleRequest, rule?: TaskRule | null) {
  if (typeof request === 'object' && 'task' in request) {
    return { task: request.task, rule: rule ?? request.rule };
  }
  return { task: request, rule };
}

function errorMessage(reason: unknown): string {
  try {
    return reason instanceof Error ? reason.message : String(reason);
  } catch {
    return 'Unprintable rejection reason';
  }
}

type HistoryEntry = { name: string; time: string };
const skipped = Symbol('skipped execution');

export default class Task {
  private hasScheduled = false;
  private readonly executions = new Set<Promise<unknown>>();
  cacheOn: boolean;
  logOn: boolean;
  readonly historyLimit: number;
  job: Job;
  success: (HistoryEntry & { result: any })[] = [];
  fail: (HistoryEntry & { errMsg: string })[] = [];
  count: HistoryEntry[] = [];

  constructor(
    public readonly name: string,
    public rule: TaskRule,
    public todo: () => unknown,
    public options: TaskOption = {}
  ) {
    this.logOn = options.logOn ?? true;
    this.cacheOn = options.cacheOn ?? false;
    this.historyLimit = options.historyLimit ?? 1000;
    if (!Number.isSafeInteger(this.historyLimit) || this.historyLimit < 0) {
      throw new RangeError('historyLimit must be a non-negative safe integer');
    }
    this.job = this.createJob();
  }

  get alive(): boolean {
    return this.job.nextInvocation() != null;
  }

  get runningCount() {
    return this.executions.size;
  }

  async waitForIdle(): Promise<void> {
    await Promise.allSettled(this.executions);
  }

  private entry(): HistoryEntry {
    return { name: this.name, time: new Date().toLocaleString() };
  }

  private record<T>(history: T[], entry: T) {
    if (this.historyLimit === 0) return;
    if (history.length >= this.historyLimit) history.splice(0, history.length - this.historyLimit + 1);
    history.push(entry);
    scheduleCacheRelease(this);
  }

  private createJob() {
    const job = new Job(async () => {
      if (this.options.overlap === 'skip' && this.runningCount > 0) return skipped;
      if (this.cacheOn) this.record(this.count, this.entry());
      const execution = Promise.resolve().then(() => this.todo());
      this.executions.add(execution);
      try {
        return await execution;
      } finally {
        this.executions.delete(execution);
      }
    });
    job.on('success', result => {
      if (result === skipped) return;
      if (this.cacheOn) this.record(this.success, { ...this.entry(), result });
      if (this.logOn) console.log(`[Scheduler][Task:${this.name}]Completed`, result);
    });
    job.on('error', (reason: unknown) => {
      const errMsg = errorMessage(reason);
      if (this.cacheOn) this.record(this.fail, { ...this.entry(), errMsg });
      if (this.logOn) console.error(`[Scheduler][Task:${this.name}]Failed`, errMsg);
    });
    return job;
  }

  start() {
    if (!this.alive) this.reschedule(this.rule);
  }

  reschedule(rule: TaskRule) {
    Task.scheduleTogether([{ task: this, rule }]);
  }

  /** @internal All candidates are prepared synchronously before any live schedule is replaced. */
  static scheduleTogether(changes: ReadonlyArray<{ task: Task; rule: TaskRule }>) {
    const candidates: { task: Task; rule: TaskRule; job: Job }[] = [];
    try {
      for (const { task, rule } of changes) {
        const job = task.hasScheduled || changes.length > 1 ? task.createJob() : task.job;
        candidates.push({ task, rule, job });
        const invalid = rule == null || (typeof rule === 'string' && !rule.trim()) ||
          (rule instanceof Date && !Number.isFinite(rule.getTime())) ||
          (typeof rule === 'number' && !Number.isFinite(rule));
        // @types/node-schedule narrows Job.schedule compared with scheduleJob.
        if (invalid || !job.schedule(rule as Date | string | number)) {
          throw new Error(`[Scheduler]Cannot schedule task "${task.name}"`);
        }
      }
    } catch (error) {
      for (const { task, job } of candidates) {
        job.cancel();
        if (job === task.job) task.job = task.createJob();
      }
      throw error;
    }
    for (const { task, rule, job } of candidates) {
      const previous = task.job;
      task.job = job;
      task.rule = rule;
      task.hasScheduled = true;
      if (previous !== job) previous.cancel();
    }
  }

  restart() { this.reschedule(this.rule); }
  stop() { this.job.cancel(); }

  releaseCache() {
    forgetCache(this);
    this.count = [];
    this.success = [];
    this.fail = [];
  }

  toString() {
    return `Task{name:${JSON.stringify(this.name)}, rule:${JSON.stringify(this.rule)}, alive:${this.alive}, count:${this.count.length}, success:${this.success.length}, fail:${this.fail.length}}`;
  }
}
