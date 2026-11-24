const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Task, Scheduler, Plan, PlanTool } = require('../..');

test('removing an explicit helper owner detaches every removed member', () => {
  const task = new Task('explicit', '* * * * * *', () => {});
  Scheduler.addTask(task);
  Scheduler.registerHelper(task);
  const helper = Scheduler.getTask('explicit-helper');
  assert.throws(() => Scheduler.registerHelper(helper));
  const plan = new Plan('helper-plan', [task, helper]);
  PlanTool.addPlan(plan);
  plan.removeTasks([task, helper]);
  assert.equal(Scheduler.task_pool.size, 0);
  assert.equal(plan.task_group.size, 0);
  assert.doesNotThrow(() => PlanTool.removePlan(plan));
});

test('an invalid explicit helper leaves the previous business schedule intact', () => {
  const rule = new Date(Date.now() + 60000);
  const task = new Task('owner', rule, () => {});
  Scheduler.addTask(task, true);
  Scheduler.registerHelper(task);
  Scheduler.getTask('owner-helper').rule = new Date(0);
  const old = task.job;
  assert.throws(() => Scheduler.rescheduleTask(task, '* * * * * *'));
  assert.equal(task.job, old);
  assert.equal(task.rule, rule);
  assert.ok(task.alive);
});
