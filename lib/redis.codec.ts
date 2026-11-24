import { parseExpression } from 'cron-parser';
import { Range, RecurrenceRule, RecurrenceSpecObjLit } from 'node-schedule';
import type { TaskRule } from './task';
import type { TaskOption } from './task.option';

export interface RedisTaskDefinition {
  name: string;
  handler: string;
  rule: TaskRule;
  options?: TaskOption;
}

export interface StoredRedisTask extends RedisTaskDefinition {
  enabled: boolean;
}

const fields = ['year', 'month', 'date', 'dayOfWeek', 'hour', 'minute', 'second'] as const;
type Field = typeof fields[number];
const limits: Record<Field, [number, number]> = {
  year: [0, 275760], month: [0, 11], date: [1, 31], dayOfWeek: [0, 6],
  hour: [0, 23], minute: [0, 59], second: [0, 59]
};

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new TypeError(`Invalid Redis task: ${message}`);
}

function plain(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function allowedKeys(value: object, keys: readonly string[]) {
  check(Object.keys(value).every(key => keys.includes(key)), 'unexpected fields');
}

function timestamp(value: unknown) {
  const ms = value instanceof Date ? value.getTime() :
    typeof value === 'number' || typeof value === 'string' ? new Date(value).getTime() : NaN;
  check(Number.isFinite(ms), 'invalid date');
  return ms;
}

function validateRange(value: Record<string, unknown>) {
  const { start, end, step } = value;
  check(typeof start === 'number' && Number.isSafeInteger(start) &&
    typeof end === 'number' && Number.isSafeInteger(end) && start <= end &&
    typeof step === 'number' && Number.isSafeInteger(step) && step > 0, 'invalid recurrence range');
}

function checkSegment(value: unknown, field: Field) {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    check(value.length > 0, `empty ${field} list`);
    for (const item of value) {
      check(item != null && !Array.isArray(item), `invalid ${field} list`);
      checkSegment(item, field);
    }
  } else if (value instanceof Range) {
    validateRange(value as unknown as Record<string, unknown>);
    const [min, max] = limits[field];
    check(nextAllowed(value, min) <= max, `empty ${field} range`);
  } else {
    const n = typeof value === 'string' && value.trim() ? Number(value) : value;
    const [min, max] = limits[field];
    check(typeof n === 'number' && Number.isInteger(n) && n >= min && n <= max, `invalid ${field}`);
  }
}

function checkZone(value: unknown) {
  if (value === undefined) return;
  check(typeof value === 'string' && value.trim(), 'invalid timezone');
  // The same parser as node-schedule also understands fixed offsets and local time.
  parseExpression('* * * * * *', { tz: value }).next();
}

function checkRule(value: unknown, inWindow = false): asserts value is TaskRule {
  if (typeof value === 'string') {
    check(value.trim(), 'empty scheduling rule');
    try { parseExpression(value); } catch { timestamp(value); }
    return;
  }
  if (value instanceof Date || typeof value === 'number') {
    timestamp(value);
    return;
  }
  check(plain(value) || value instanceof RecurrenceRule, 'unsupported scheduling rule');
  checkZone(value.tz);
  if ('rule' in value) {
    check(!inWindow, 'nested schedule window');
    allowedKeys(value, ['rule', 'start', 'end', 'tz']);
    checkRule(value.rule, true);
    const start = value.start === undefined ? -Infinity : timestamp(value.start);
    const end = value.end === undefined ? Infinity : timestamp(value.end);
    check(start <= end, 'start is after end');
  } else {
    const native = value instanceof RecurrenceRule;
    allowedKeys(value, native ? [...fields, 'tz', 'recurs'] : [...fields, 'tz']);
    if (native) check((value as RecurrenceRule & { recurs: boolean }).recurs === true, 'invalid recurrence');
    for (const field of fields) checkSegment(value[field], field);
    if (value.month != null && value.date != null) {
      const daysPerMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      const firstDay = nextAllowed(value.date, 1);
      check(daysPerMonth.some((days, month) => days >= firstDay &&
        nextAllowed(value.month, month) === month), 'day does not occur in specified months');
    }
  }
}

function checkTask(value: unknown): asserts value is StoredRedisTask {
  check(plain(value), 'expected a task object');
  check(typeof value.name === 'string' && value.name.trim() && !value.name.endsWith('-helper'), 'invalid name');
  check(typeof value.handler === 'string' && value.handler.trim(), 'invalid handler');
  check(typeof value.enabled === 'boolean', 'invalid enabled flag');
  checkRule(value.rule);
  const opts = value.options;
  if (opts === undefined) return;
  check(plain(opts), 'invalid options');
  allowedKeys(opts, ['cacheOn', 'logOn', 'historyLimit', 'overlap']);
  for (const flag of ['cacheOn', 'logOn']) {
    check(opts[flag] === undefined || typeof opts[flag] === 'boolean', `invalid ${flag}`);
  }
  check(opts.overlap === undefined || opts.overlap === 'allow' || opts.overlap === 'skip', 'invalid overlap');
  check(opts.historyLimit === undefined || (typeof opts.historyLimit === 'number' &&
    Number.isSafeInteger(opts.historyLimit) && opts.historyLimit >= 0), 'invalid historyLimit');
}

export function encodeTask(task: StoredRedisTask): string {
  checkTask(task);
  const { name, handler, rule, options, enabled } = task;
  return JSON.stringify({ version: 1, name, handler, rule, options, enabled }, function (key, value) {
    // Date.toJSON runs before a replacer. Read the original value to preserve its type.
    const original = this[key];
    if (original instanceof Date) return { $type: 'date', ms: original.getTime() };
    if (original instanceof Range) return { $type: 'range', ...original };
    if (original instanceof RecurrenceRule) {
      const calendar = { $type: 'recurrence', recurs: true, tz: original.tz } as Record<string, unknown>;
      for (const field of fields) calendar[field] = original[field] ?? null;
      return calendar;
    }
    // An explicitly unspecified second is a wildcard; an omitted second defaults to zero.
    if (value === undefined && key === 'second') return null;
    return value;
  });
}

export function decodeTask(text: string): StoredRedisTask {
  const data: unknown = JSON.parse(text, (_key, value: unknown) => {
    if (!plain(value) || !('$type' in value)) return value;
    const { $type, ...values } = value;
    if ($type === 'date') {
      allowedKeys(values, ['ms']);
      check(typeof values.ms === 'number', 'invalid encoded date');
      return new Date(timestamp(values.ms));
    }
    if ($type === 'range') {
      allowedKeys(values, ['start', 'end', 'step']);
      validateRange(values);
      return Object.assign(new Range(), values);
    }
    check($type === 'recurrence', 'unknown rule type');
    allowedKeys(values, [...fields, 'tz', 'recurs']);
    check(values.recurs === true && fields.every(field => field in values), 'incomplete recurrence');
    return Object.assign(new RecurrenceRule(), values);
  });
  check(plain(data) && data.version === 1, 'unsupported schema version');
  allowedKeys(data, ['version', 'name', 'handler', 'rule', 'options', 'enabled']);
  const { version, ...task } = data;
  checkTask(task);
  return task;
}

function lastYear(value: unknown): number {
  if (value == null) return Infinity;
  if (Array.isArray(value)) return value.reduce((last, item) => Math.max(last, lastYear(item)), -Infinity);
  if (value instanceof Range) return (value as Range & { end: number }).end;
  return Number(value);
}

function nextAllowed(value: unknown, from: number): number {
  if (value == null) return from;
  if (Array.isArray(value)) return value.reduce((first, item) => Math.min(first, nextAllowed(item, from)), Infinity);
  if (value instanceof Range) {
    const { start, end, step } = value as Range & { start: number; end: number; step: number };
    const candidate = start + Math.max(0, Math.ceil((from - start) / step)) * step;
    // Range.contains includes end only for a unit step in node-schedule 2.x.
    return (step === 1 ? candidate <= end : candidate < end) ? candidate : Infinity;
  }
  return Number(value) >= from ? Number(value) : Infinity;
}

function localYear(ms: number, tz?: string) {
  const secondBefore = new Date(Math.floor(ms / 1000) * 1000 - 1000);
  return parseExpression('* * * * * *', { currentDate: secondBefore, tz }).next().getFullYear();
}

function scheduleWindow(rule: TaskRule, now: number) {
  checkRule(rule);
  const window = typeof rule === 'object' && 'rule' in rule ? rule : undefined;
  const start = Math.max(now, window?.start === undefined ? now : timestamp(window.start));
  const end = window?.end === undefined ? Infinity : timestamp(window.end);
  const value = typeof rule === 'object' && 'rule' in rule ? rule.rule : rule;
  const tz = window ? window.tz : (typeof value === 'object' && !(value instanceof Date) ? value.tz : undefined);
  return { value, start, end, tz };
}

function nextCalendarOccurrence(value: RecurrenceSpecObjLit, start: number, end: number, zone?: string): Date | null {
  if (end < start) return null;
  const first = localYear(start, zone);
  const last = Math.min(lastYear(value.year), Number.isFinite(end) ? localYear(end, zone) : Infinity);
  // Search years separately. node-schedule does not terminate on an exhausted year array,
  // and a numeric year's nextInvocationDate also consults the real clock, not just its base.
  const calendar = new RecurrenceRule();
  Object.assign(calendar, value, { year: null, tz: zone });
  for (let year = nextAllowed(value.year, first); year <= last; year = nextAllowed(value.year, year + 1)) {
    const base = year === first ? start : parseExpression('0 0 0 1 1 *', {
      currentDate: Date.UTC(year - 1, 11, 29), tz: zone
    }).next().getTime() - 1000;
    const next = calendar.nextInvocationDate(new Date(base));
    if (next && next.getTime() <= end && localYear(next.getTime(), zone) === year) return next;
  }
  return null;
}

/** Exact one-shot substitute for year matchers node-schedule cannot exhaust safely. */
export function nextYearOccurrence(rule: TaskRule, now = Date.now()): Date | null | undefined {
  const { value, start, end, tz } = scheduleWindow(rule, now);
  if (typeof value !== 'object' || value instanceof Date || value.year == null || typeof value.year === 'number') {
    return undefined;
  }
  return nextCalendarOccurrence(value, start, end, tz);
}

/** Identify elapsed schedules on restore, without replaying missed invocations. */
export function isExpiredRule(rule: TaskRule, now = Date.now()): boolean {
  const { value, start, end, tz } = scheduleWindow(rule, now);
  if (end < start) return true;
  if (typeof value === 'string') {
    let cron;
    try { cron = parseExpression(value, { currentDate: start, endDate: Number.isFinite(end) ? end : undefined, tz }); }
    catch { return timestamp(value) < now; }
    return Number.isFinite(end) && !cron.hasNext();
  }
  if (typeof value === 'number' || value instanceof Date) return timestamp(value) < now;
  if (value.year == null && !Number.isFinite(end)) return false;
  return nextCalendarOccurrence(value, start, end, tz) === null;
}
