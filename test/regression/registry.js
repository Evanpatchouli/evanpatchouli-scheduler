const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Scheduler, Task } = require('../..');

const make = (name, rule = '* * * * * *') => new Task(name, rule, () => {});
test('registration rejects reserved and conflicting names before touching existing tasks', () => {
  const active = make('active');
  Scheduler.addTask(active, true);
  for (const tasks of [[make(' ')], [make('active-helper')], [make('new'), make('active')], [make('new'), make('new')]]) {
    assert.throws(() => Scheduler.addTasks(tasks));
  }
  assert.throws(() => Scheduler.removeTask(make('active')));
  assert.equal(Scheduler.getTask('active'), active);
  assert.equal(active.alive, true);
  assert.equal(Scheduler.getTask('new'), undefined);
});

test('batches preflight missing members and roll back newly started or registered tasks', () => {
  const first = make('first'), invalid = make('bad', new Date(0));
  Scheduler.addTask(first);
  assert.throws(() => Scheduler.startTasks([first, 'missing']));
  assert.equal(first.alive, false);
  Scheduler.addTask(invalid);
  assert.throws(() => Scheduler.startTasks([first, invalid]));
  assert.equal(first.alive, false);
  Scheduler.startTask(first);
  for (const method of ['stopTasks', 'removeTasks', 'restartTasks']) {
    assert.throws(() => Scheduler[method](['first', 'missing']));
    assert.equal(first.alive, true);
  }
  assert.throws(() => Scheduler.addTasks([make('a'), make('b', new Date(0))], true));
  assert.equal(Scheduler.getTask('a'), undefined);
  assert.equal(Scheduler.getTask('b'), undefined);
});
