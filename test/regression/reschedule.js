const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setTimeout: wait } = require('node:timers/promises');
const { Task, Scheduler } = require('../..');

test('failed replacement preserves the actual old execution and failed registration is retryable', async () => {
  const oldDate = new Date(Date.now() + 300);
  let calls = 0;
  const task = new Task('atomic', oldDate, () => calls++);
  Scheduler.addTask(task, true);
  const oldJob = task.job;
  for (const invalid of [new Date(0), new Date(NaN), '', 'bad cron']) {
    assert.throws(() => Scheduler.rescheduleTask({ task: 'atomic', rule: invalid }));
    assert.equal(task.rule, oldDate);
    assert.equal(task.job, oldJob);
  }
  const bad = new Task('retry', new Date(0), () => {});
  assert.throws(() => Scheduler.addTask(bad, true));
  assert.equal(Scheduler.getTask('retry'), undefined);
  bad.rule = '* * * * * *';
  Scheduler.addTask(bad, true);
  await wait(500);
  assert.equal(calls, 1);
});

test('object arguments and rescheduling inside a one-off callback use the new job', async () => {
  let calls = 0;
  const task = new Task('switch', new Date(Date.now() + 10000), () => {
    if (++calls === 1) Scheduler.rescheduleTask({ task, rule: new Date(Date.now() + 100) });
  });
  Scheduler.addTask(task, true);
  Scheduler.rescheduleTask({ task: 'switch', rule: '* * * * * *' });
  Scheduler.rescheduleTask(task, new Date(Date.now() + 100));
  await wait(450);
  assert.equal(calls, 2);
  assert.equal(task.alive, false);
});
