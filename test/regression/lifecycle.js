const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setTimeout: wait } = require('node:timers/promises');
const { Task, Scheduler } = require('../..');

test('start is idempotent, removed schedules never fire and cold restart runs the business callback', async () => {
  const due = new Date(Date.now() + 250);
  const calls = [];
  function register(name) {
    const task = new Task(name, due, () => calls.push(name));
    Scheduler.addTask(task);
    return task;
  }
  const once = register('once');
  Scheduler.startTask(once);
  assert.equal(once.alive, true);
  Scheduler.startAll();
  Scheduler.startTask(once);
  const removed = register('removed');
  Scheduler.startTask(removed);
  Scheduler.removeTask(removed);
  const cold = register('cold');
  Scheduler.restartTask(cold);
  const stopped = register('stopped');
  Scheduler.startTask(stopped);
  Scheduler.stopTask(stopped);
  Scheduler.restartTask(stopped);
  await wait(500);
  assert.deepEqual(calls.sort(), ['cold', 'once', 'stopped']);
  assert.equal(once.alive, false);
});
