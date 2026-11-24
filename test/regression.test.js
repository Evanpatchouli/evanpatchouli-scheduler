const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { Scheduler, Task } = require('..');
require('./regression/registry');
require('./regression/shutdown');
require('./regression/reschedule');
require('./regression/lifecycle');

afterEach(() => Scheduler.dumpTasks());

test('register, find and remove a task through the package entry point', () => {
  const task = new Task('example', '* * * * * *', () => {});
  Scheduler.addTask(task);
  assert.equal(Scheduler.getTask('example'), task);
  Scheduler.removeTask(task);
  assert.equal(Scheduler.getTask('example'), undefined);
});
