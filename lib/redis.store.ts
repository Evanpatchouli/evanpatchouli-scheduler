import { randomBytes } from 'crypto';

/** A connected Redis client using the default command reply mapping. */
export interface SchedulerRedisClient {
  sendCommand(args: string[]): Promise<unknown>;
}

export class RedisLeaseLostError extends Error {
  constructor() {
    super('[Scheduler]Redis namespace lease is no longer owned by this scheduler');
    this.name = 'RedisLeaseLostError';
  }
}

export class RedisConflictError extends Error {
  constructor(name: string) {
    super(`[Scheduler]Redis task "${name}" changed before the update`);
    this.name = 'RedisConflictError';
  }
}

const renewLease = `
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
return redis.call('PEXPIRE', KEYS[1], ARGV[2])`;

const releaseLease = `
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
return redis.call('DEL', KEYS[1])`;

const loadTasks = `
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return -1 end
return redis.call('HGETALL', KEYS[2])`;

const writeTask = `
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return -1 end
local current = redis.call('HGET', KEYS[2], ARGV[2])
local expected = ARGV[3] == 'present' and ARGV[4] or false
if current ~= expected then return 0 end
if ARGV[5] == 'delete' then
  redis.call('HDEL', KEYS[2], ARGV[2])
else
  redis.call('HSET', KEYS[2], ARGV[2], ARGV[6])
end
return 1`;

const permitTask = `
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
if redis.call('HGET', KEYS[2], ARGV[2]) ~= ARGV[3] then return 0 end
return 1`;

function redisText(reply: unknown): string {
  if (typeof reply === 'string') return reply;
  if (Buffer.isBuffer(reply)) return reply.toString('utf8');
  throw new TypeError('[Scheduler]Expected a string reply from Redis');
}

function booleanReply(reply: unknown): boolean {
  if (reply === 1) return true;
  if (reply === 0) return false;
  throw new TypeError('[Scheduler]Expected a 0 or 1 reply from Redis');
}

function ttlArgument(ttlMs: number): string {
  if (!Number.isSafeInteger(ttlMs) || ttlMs <= 0) {
    throw new RangeError('[Scheduler]Redis lease TTL must be a positive integer in milliseconds');
  }
  return String(ttlMs);
}

export class RedisStore {
  private readonly token = randomBytes(24).toString('hex');
  private readonly ownerKey: string;
  private readonly tasksKey: string;

  constructor(private readonly client: SchedulerRedisClient, namespace: string) {
    if (!namespace.trim()) throw new Error('[Scheduler]Redis namespace cannot be empty');
    // One hash tag keeps both keys in the same Redis Cluster slot.
    const prefix = `scheduler:{${encodeURIComponent(namespace)}}`;
    this.ownerKey = `${prefix}:owner`;
    this.tasksKey = `${prefix}:tasks`;
  }

  async acquire(ttlMs: number): Promise<boolean> {
    const reply = await this.client.sendCommand(['SET', this.ownerKey, this.token, 'NX', 'PX', ttlArgument(ttlMs)]);
    if (reply === null) return false;
    if (redisText(reply) === 'OK') return true;
    throw new TypeError('[Scheduler]Unexpected Redis SET reply');
  }

  async renew(ttlMs: number): Promise<boolean> {
    const reply = await this.client.sendCommand(['EVAL', renewLease, '1', this.ownerKey, this.token, ttlArgument(ttlMs)]);
    return booleanReply(reply);
  }

  async release(): Promise<void> {
    const reply = await this.client.sendCommand(['EVAL', releaseLease, '1', this.ownerKey, this.token]);
    booleanReply(reply);
  }

  private evalTasks(script: string, ...args: string[]): Promise<unknown> {
    return this.client.sendCommand(['EVAL', script, '2', this.ownerKey, this.tasksKey, this.token, ...args]);
  }

  async load(): Promise<Map<string, string>> {
    const reply = await this.evalTasks(loadTasks);
    if (reply === -1) throw new RedisLeaseLostError();
    if (!Array.isArray(reply) || reply.length % 2 !== 0) {
      throw new TypeError('[Scheduler]Expected Redis hash field/value pairs');
    }
    const tasks = new Map<string, string>();
    for (let i = 0; i < reply.length; i += 2) {
      tasks.set(redisText(reply[i]), redisText(reply[i + 1]));
    }
    return tasks;
  }

  async write(name: string, previous: string | null, next: string | null): Promise<void> {
    const reply = await this.evalTasks(writeTask, name,
      previous === null ? 'absent' : 'present', previous ?? '',
      next === null ? 'delete' : 'set', next ?? '');
    if (reply === -1) throw new RedisLeaseLostError();
    if (!booleanReply(reply)) throw new RedisConflictError(name);
  }

  async permits(name: string, version: string): Promise<boolean> {
    return booleanReply(await this.evalTasks(permitTask, name, version));
  }
}
