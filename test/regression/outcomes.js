const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Task, Scheduler } = require('../..');
const { setTimeout: wait } = require('node:timers/promises');

test('options control logs and history, including rejection without an Error', async (t) => {
  const messages = [];
  t.mock.method(console, 'log', (...args) => messages.push(args));
  t.mock.method(console, 'error', (...args) => messages.push(args));
  const at = new Date(Date.now() + 120);
  const success = new Task('success', at, () => 42, { logOn: false, cacheOn: true });
  const failure = new Task('failure', at, () => Promise.reject(), { logOn: false, cacheOn: true });
  const quiet = new Task('quiet', at, () => 0, { logOn: false });
  Scheduler.addTasks([success, failure, quiet], true);
  await wait(300);
  assert.equal(success.success[0].result, 42);
  assert.equal(failure.fail[0].errMsg, 'undefined');
  assert.equal(failure.job.running, 0);
  assert.equal(failure.count.length, 1);
  assert.equal(quiet.count.length, 0);
  Scheduler.stopTasks([success, failure, quiet]);
  assert.deepEqual(messages, []);
});

test('completion is reported after the async callback settles', { timeout: 3000 }, async (t) => {
  const messages = [];
  t.mock.method(console, 'log', (...args) => messages.push(args));
  let entered, release;
  const started = new Promise(resolve => { entered = resolve; });
  const gate = new Promise(resolve => { release = resolve; });
  const task = new Task('async', new Date(Date.now() + 100), () => { entered(); return gate; });
  Scheduler.addTask(task, true);
  await started;
  assert.equal(messages.length, 0);
  const done = new Promise(resolve => task.job.once('success', resolve));
  release();
  await done;
  assert.equal(messages.length, 1);
});
