const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setTimeout: wait } = require('node:timers/promises');
const { Task, Scheduler, RecurrenceRule } = require('../..');

test('invalid bounded rules keep the original business invocation', async () => {
  let calls = 0;
  const original = new Date(Date.now() + 220);
  const task = new Task('window', original, () => calls++, { logOn: false });
  Scheduler.addTask(task, true);
  const before = task.job;
  for (const rule of [
    { rule: '' }, { rule: '  ' }, { rule: new Date(NaN) }, { rule: null },
    { rule: '* * * * * *', end: 'invalid-date' },
    { rule: '* * * * * *', start: new Date(NaN) },
    { rule: '* * * * * *', start: 2000, end: 1000 }
  ]) {
    assert.throws(() => Scheduler.rescheduleTask(task, rule));
    assert.equal(task.job, before);
    assert.equal(task.rule, original);
  }
  await wait(400);
  assert.equal(calls, 1);
});

test('valid bounded cron and recurrence objects continue to schedule in a timezone', () => {
  const start = new Date(Date.now() + 60000);
  const end = new Date(start.getTime() + 120000);
  const recurrence = new RecurrenceRule();
  const task = new Task('bounded', { rule: '* * * * * *', start, end, tz: 'Asia/Shanghai' }, () => {});
  Scheduler.addTask(task, true);
  Scheduler.rescheduleTask(task, { rule: recurrence, start: start.toISOString(), end, tz: 'UTC' });
  const next = task.job.nextInvocation().getTime();
  assert.ok(next >= start.getTime() && next <= end.getTime());
});
