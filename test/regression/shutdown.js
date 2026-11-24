const { test } = require('node:test');
const assert = require('node:assert/strict');
const { scheduleJob } = require('node-schedule');
const { Task, Scheduler } = require('../..');

test('shutdown waits for active and removed tasks and preserves same-name host jobs', { timeout: 3000 }, async (t) => {
  const host = scheduleJob('owned', new Date(Date.now() + 60000), () => {});
  t.after(() => host.cancel());
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  let entered = 0, completed = 0, ready;
  const started = new Promise(resolve => { ready = resolve; });
  for (const name of ['owned', 'removed']) {
    Scheduler.addTask(new Task(name, new Date(Date.now() + 100), async () => {
      if (++entered === 2) ready();
      await gate;
      completed++;
      if (name === 'removed') throw new Error('finished with failure');
    }), true);
  }
  await started;
  Scheduler.removeTask('removed');
  let settled = false;
  const shutdown = Scheduler.stopAll().then(() => { settled = true; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(settled, false);
  assert.ok(host.nextInvocation());
  release();
  await shutdown;
  assert.equal(completed, 2);
  assert.ok(host.nextInvocation());
});
