const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setTimeout: wait } = require('node:timers/promises');
const { Task, Scheduler } = require('../..');

test('failed batch registration preserves a previously scheduled standalone task', async () => {
  let calls = 0;
  const direct = new Task('direct', new Date(Date.now() + 200), () => calls++, { logOn: false });
  direct.start();
  const old = direct.job;
  const bad = new Task('expired', new Date(0), () => {});
  assert.throws(() => Scheduler.addTasks([direct, bad], true));
  assert.equal(direct.job, old);
  assert.equal(direct.alive, true);
  assert.equal(Scheduler.getTask(direct), undefined);
  await wait(400);
  assert.equal(calls, 1);
});

test('batch restart with a late invalid rule leaves active and dormant members as they were', async () => {
  let calls = 0;
  const due = new Date(Date.now() + 200);
  const active = new Task('active', due, () => calls++, { logOn: false });
  const dormant = new Task('dormant', due, () => assert.fail('unexpected run'));
  const bad = new Task('expired', new Date(0), () => {});
  Scheduler.addTasks([active, dormant, bad]);
  Scheduler.startTask(active);
  const old = active.job;
  const untouched = dormant.job;
  assert.throws(() => Scheduler.restartTasks([active, dormant, bad]));
  assert.equal(active.job, old);
  assert.equal(dormant.job, untouched);
  assert.equal(dormant.alive, false);
  await wait(400);
  assert.equal(calls, 1);
});
