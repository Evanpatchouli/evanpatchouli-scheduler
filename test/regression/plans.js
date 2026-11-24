const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Task, Scheduler, Plan, PlanTool } = require('../..');
const make = name => new Task(name, new Date(Date.now() + 60000), () => {});

test('plans stage members before registration and cannot manage other groups', () => {
  const a = make('a'), b = make('b');
  const A = new Plan('A', [a]), B = new Plan('B', [b]);
  assert.equal(Scheduler.getTask(a), undefined);
  assert.throws(() => A.start());
  PlanTool.addPlan(A);
  PlanTool.addPlan(B);
  const replacement = new Plan('A');
  assert.throws(() => PlanTool.addPlan(replacement));
  assert.throws(() => PlanTool.removePlan(replacement));
  for (const method of ['startTasks', 'stopTasks', 'removeTasks', 'restartTasks']) {
    assert.throws(() => A[method]([a, 'b']));
  }
  assert.throws(() => A.rescheduleTask({ task: b, rule: '* * * * * *' }));
  assert.equal(a.alive, false);
  assert.equal(A.alive, false);
  B.startTask(b);
  assert.equal(B.alive, true);
  Scheduler.removeTask(b);
  assert.equal(B.getTask('b'), undefined);
  assert.equal(B.alive, false);
  assert.doesNotThrow(() => PlanTool.removePlan(B));
});

test('shared members keep their identity and failed plan registration leaves no partial members', () => {
  const shared = make('shared'), unique = make('unique');
  const A = new Plan('A', [shared, unique]), B = new Plan('B', [shared]);
  Scheduler.addTask(shared);
  PlanTool.addPlan(A);
  PlanTool.addPlan(B);
  A.startTask(unique);
  assert.equal(A.alive, true);
  assert.equal(B.alive, false);
  A.removeTask(shared);
  assert.equal(B.getTask('shared'), shared);
  assert.equal(Scheduler.getTask(shared), shared);
  const conflict = new Plan('conflict', [make('first'), make('shared')]);
  assert.throws(() => PlanTool.addPlan(conflict));
  assert.equal(PlanTool.findPlan('conflict'), undefined);
  assert.equal(Scheduler.getTask('first'), undefined);
  PlanTool.removePlan(A);
  assert.equal(unique.alive, false);
  assert.equal(Scheduler.getTask(unique), unique);
  PlanTool.addPlan(A);
  Scheduler.dumpTasks();
  assert.equal(A.task_group.size, 0);
  assert.equal(B.task_group.size, 0);
});
