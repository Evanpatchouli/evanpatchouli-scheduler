const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Scheduler, Starter, Task } = require('../..');

test('documented singleton, start aliases and callback results work through the package', async () => {
  assert.equal(Scheduler.getInstance(), Scheduler);
  const task = new Task('public', new Date(Date.now() + 60000), () => {});
  Scheduler.addTask(task);
  Scheduler.start('public');
  const current = task.job;
  Starter.run();
  assert.equal(task.job, current);
  assert.equal(Starter.run(false, n => n + 1, 6), 7);
  assert.equal(await Starter.run(false, async () => 42), 42);
  await assert.rejects(Starter.run(false, async () => { throw new Error('init'); }), /init/);
});
