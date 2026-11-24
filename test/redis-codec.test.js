const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Range, RecurrenceRule } = require('node-schedule');
const { encodeTask, decodeTask, isExpiredRule, nextYearOccurrence } = require('../dist/redis.codec');

const task = rule => ({
  name: 'sweep', handler: 'jobs.sweep', enabled: true, rule,
  options: { cacheOn: true, logOn: false, historyLimit: 3, overlap: 'skip' }
});
const copy = value => decodeTask(encodeTask(value));

test('Redis rules round-trip cron, timestamps, dates, and numeric strings without changing types', () => {
  for (const rule of ['*/5 * * * * *', '1', '2040-01-02T00:00:00Z', 2200000000000, new Date('2040-03-01')]) {
    const input = task(rule);
    assert.deepEqual(copy(input), input);
    assert.notEqual(copy(input).options, input.options);
  }
});

test('calendar ranges, null wildcards, timezone and date boundaries survive Redis round trips', () => {
  const r = new RecurrenceRule();
  r.year = [2040, 2041];
  r.hour = new Range(2, 8, 2);
  r.minute = [new Range(0, 20, 5), 42];
  r.second = null;
  r.tz = 'Asia/Shanghai';
  const start = new Date('2040-01-01');
  const input = task({ rule: r, start, end: '2042-01-01T00:00:00Z', tz: 'Asia/Shanghai' });
  const result = copy(input);
  assert.deepEqual(result, input);
  assert.ok(result.rule.rule instanceof RecurrenceRule);
  assert.equal(result.rule.rule.minute[0].contains(15), true);
  result.rule.start.setFullYear(2030);
  result.rule.rule.minute.pop();
  assert.equal(start.toISOString(), '2040-01-01T00:00:00.000Z');
  assert.equal(r.minute.length, 2);
  const literal = { dayOfWeek: [1, 4], month: '4', tz: 'UTC' };
  assert.deepEqual(copy(task(literal)).rule, literal);
  assert.equal(copy(task({ second: undefined })).rule.second, null);
  assert.equal(copy(task({ rule: '* * * * * *', tz: 'UTC+08:00' })).rule.tz, 'UTC+08:00');
});

test('Redis records reject malformed rules, options, wire tags and versions', () => {
  for (const rule of ['', 'INVALID CRON', new Date(NaN), NaN, { rule: '' }, { hour: [] },
    { dayOfWeek: 10 }, { rule: '* * * * * *', start: 'bad' }, { rule: '* * * * * *', tz: 'not/a/zone' },
    { second: { start: 0, end: 2, step: 1 } }, { unrelated: true }]) {
    assert.throws(() => encodeTask(task(rule)));
  }
  for (const options of [{ cacheOn: 1 }, { logOn: 'true' }, { historyLimit: -1 }, { overlap: 'queue' }]) {
    assert.throws(() => encodeTask({ ...task('0 * * * * *'), options }));
  }
  const object = JSON.parse(encodeTask(task('0 * * * * *')));
  for (const patch of [{ version: 2 }, { enabled: '1' }, { handler: '' }, { rule: { $type: 'bad' } },
    { rule: { $type: 'date', ms: null } }, { rule: { $type: 'recurrence' } }]) {
    assert.throws(() => decodeTask(JSON.stringify({ ...object, ...patch })));
  }
});

test('restore distinguishes elapsed one-offs and bounded or finite schedules from recurring cron', () => {
  const now = Date.parse('2040-07-03T12:00:00Z');
  for (const rule of [new Date(now - 1), now - 1, '2040-07-03T11:00:00Z',
    { rule: '* * * * * *', end: now - 1 }, { rule: '0 0 1 * *', end: now + 1000, tz: 'UTC' },
    { year: [2037, 2039], second: 20 }, { year: 2040, month: 1, date: 1, tz: 'UTC' },
    { year: [2041, 2042], month: 1, date: 29, tz: 'UTC' },
    { rule: { year: [2039, 2042] }, end: '2041-05-01T00:00:00Z' }]) {
    assert.equal(isExpiredRule(rule, now), true);
  }
  for (const rule of ['1', '* * * * * *', new Date(now + 100), { year: [2041, 2042] },
    { rule: '* * * * * *', end: now + 2000 }]) assert.equal(isExpiredRule(rule, now), false);
  assert.equal(isExpiredRule({ year: 2000, month: 1, date: 29 }, Date.parse('1999-07-03T12:00:00Z')), false);
});

test('finite calendar year matchers return exact one-offs and terminate after the final occurrence', () => {
  const rule = { year: [2040, '2042'], month: 0, date: 1, hour: 0, minute: 0, second: 0, tz: 'Asia/Shanghai' };
  const first = Date.parse('2039-12-31T16:00:00Z');
  const last = Date.parse('2041-12-31T16:00:00Z');
  assert.equal(nextYearOccurrence(rule, first - 1000).getTime(), first);
  assert.equal(nextYearOccurrence(rule, first).getTime(), last);
  assert.equal(nextYearOccurrence(rule, last), null);
  assert.equal(nextYearOccurrence({ ...rule, year: '2042' }, first).getTime(), last);
  assert.equal(nextYearOccurrence({ ...rule, year: new Range(2040, 2044, 2) }, first).getTime(), last);
  assert.equal(nextYearOccurrence({ ...rule, year: new Range(2040, 2044, 2) }, last), null);
  assert.equal(nextYearOccurrence({ rule, start: first, end: last, tz: 'Asia/Shanghai' }, first - 1000).getTime(), last);
  assert.equal(nextYearOccurrence({ rule, end: last - 1, tz: 'Asia/Shanghai' }, first), null);
  for (const standard of ['* * * * * *', new Date(last), last, { minute: 2 }, { ...rule, year: 2042 }]) {
    assert.equal(nextYearOccurrence(standard, first), undefined);
  }
});
