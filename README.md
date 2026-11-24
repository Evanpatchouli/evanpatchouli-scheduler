# @evanpatchouli/scheduler
A package help to manage the transcations scheduled in node.js.  
This frame is based on **node-schedule**,which thanks for the grate work the team of.

## Install

```shell
npm install @evanpatchouli/scheduler
```

## Latest Version

**v1.1.3**:
- Fix 1 bug and improve doc.

**v1.1.2**:
- Refactored by TypeScript.

**v1.1.1**:
- **Task.LogOn**: You can deside whether the task need to log.
- **Task.cacheOn**: You can deside whethre the task need to store histories in memory.
- **Plan** class: you can bind a group of task into a plan, by manage its tasks by plan
- **PlanTool** module: a tool to manage the plans in plan pool  
- **ScheTool** module: a tool to help use Scheduler easier.

**v1.1.0**:
- Since this version, the class Job and JobHelper have been refactored to Task and TaskHelper.
- Besides, there is a new mechanism with a new class Plan, where you can put several related Tasks into it. Altought it is in development so it is of useless at this version, but it will works at next version.
- Fix 1 bug in JobHelper(now named TaskHelper).

## Documentation

- [Task](#task)
- [Plan](#plan)
- [PlanTool](#plantool)
- [Scheduler](#scheduler)
- [ScheTool](#schetool)
- [TaskHelper](#taskhelper)
- [Starter](#starter)

## Task

```js
const { Task } = require("@evanpatchouli/scheduler");
```

### create a Task

Supply a unique name, a node-schedule rule and a callback. The optional fourth argument configures execution.

```js
const task = new Task("HelloTask", "*/5 * * * * *", async () => {
    return "hello";
}, { logOn: false, cacheOn: true, historyLimit: 100, overlap: "skip" });
```

- `logOn` defaults to `true`. One completion or failure is logged when the callback settles.
- `cacheOn` defaults to `false`. Enable it to retain the public `count`, `success` and `fail` history arrays.
- `historyLimit` defaults to 1000 entries per array. It accepts non-negative safe integers. Zero disables retention. Dirty histories share one cleanup at the next quarter hour. The cleanup timer allows the process to exit.
- `overlap` defaults to `"allow"`. With `"skip"`, a scheduled invocation is skipped while the previous callback is pending. Skips add no history and are never replayed.

`task.alive` indicates a future scheduled invocation. `task.runningCount` counts callbacks currently in progress. Use `Task.name` as the stable application identifier. Underlying Job handles may change when a rule is replaced.

Although Task has many other methods, please do not use them directly by Task. You should use **Scheduler** or **Plan** or **PlanTool** or **ScheTool** to manage your tasks unless you want to manage tasks yourself without Scheduler.

## Plan

Constructing a plan stages its members. Register it with `PlanTool.addPlan(plan)` before starting or stopping it. Registration also registers its tasks. Multiple plans may reference the same Task instance. A different task or plan with an existing name is rejected. `plan.alive` is true when at least one member has a future invocation.

Removing a member from one plan preserves it while another registered plan still references it. Removing the last membership of a registered plan removes the task from the scheduler. Removing a task through Scheduler detaches it from every registered plan. Starting or stopping a shared task affects that same task in all its plans.
```js
const { Plan } = require('@evanpatchouli/scheduler');
```

### create a plan

Create a plan without tasks
```js
let plan = new Plan("plan1");
```

Create a plan with unstarted tasks
```js
let plan = new Plan("plan1",[task1,task2]);
```

### add a task into a plan

the param should be of Task
```js
plan.addTask(task1);
```

### add tasks into a plan

```js
plan.addTasks([task1,task2]);
```

### get a task from a plan

```js
plan.getTask("task1");
```

### remove a task from a plan

the param could be of Task or Task.name
```js
plan.removeTask(task1);
// Alternatively, use plan.removeTask("task1").
```

### remove tasks from a plan
```js
plan.removeTasks([task1,task2]);
```

### start

Start all tasks of this plan
```js
plan.start();
```

### Stop

Stop all tasks of this plan
```js
plan.stop();
```

### startTask

Only start one certain task in plan.The task could be Task.name or Task
```js
plan.startTask(task1);
```

### startTasks

Only start some tasks in plan
```js
plan.startTasks([task1,"task2"]);
```

### stopTask

Only stop one certain task in plan.The task could be Task.name or Task
```js
plan.stopTask(task1);
```

### stopTasks

Only stop some tasks in plan
```js
plan.stopTasks([task1,"task2"]);
```

### restart

Stop all tasks in this plan and restart them.
```js
plan.restart();
```

### restartTask

Restart one plan member by name or instance.
```js
plan.restartTask(task1);
```

### restartTasks

Restart the specified members.
```js
plan.restartTasks([task1,"task2"]);
```

### rescheduleTask

Restart one certain task in plan. The usage is similar to **Scheduler.rescheduleTask**
```js
plan.rescheduleTask(task1, "* * * * * *");
```

## PlanTool

A module to manage your plans.
```js
const { PlanTool } = require('@evanpatchouli/scheduler');
```

### addPlan
Before you really start a plan, you **must** use **PlanTool.addPlan** to add this plan into Scheduler.plan_pool.
```js
PlanTool.addPlan(plan);
```

### startPlan
Start a registered plan by name or instance.
```js
PlanTool.startPlan(plan);
```

### stopPlan
Stop a plan though PlanTool, the param chould be name or Plan
```js
PlanTool.stopPlan(plan);
```

### removePlan
Stop the members and remove the plan from the registry. Its tasks remain available through Scheduler.
```js
PlanTool.removePlan(plan);
```

### dumpPlans
Stop and remove all plans though PlanTool
```js
PlanTool.dumpPlans();
```

### findPlan
You can get the Plan object by its name
```js
let plan1 = PlanTool.findPlan("plan1");
```

## Scheduler

```js
const { Scheduler } = require("@evanpatchouli/scheduler");
```

The manager, a singleton, for you to manage your tasks like add, start, stop, restart, remove...

### getInstance
```js
let scheduler = Scheduler.getInstance();
```

### addTask

Add a new task into task pool, the name of task **must be unique and does not ends with "-helper"**
```js
const task = new Task("HelloTask", "* * * * * *", ()=>{
    console.log("Hello, there is Scheduler");
})
scheduler.addTask(task);
```
Alternatively, register and start an unregistered task in one call. Re-registering an existing name throws.
```js
scheduler.addTask(task, true);
```

### addTasks

You can use **addTasks** to add a series of Tasks into task pool
```js
const task1 = new Task("HelloTask1", "* * * * * *", ()=>{
    console.log("Hello, there is Scheduler");
})
const task2 = new Task("HelloTask2", "* * * * * *", ()=>{
    console.log("Hello, there is Scheduler");
})
scheduler.addTasks([task1,task2]);
```
Pass `true` to register and start the batch. A name conflict or scheduling failure rolls back the new registrations. Batch start and restart prepare the whole batch before replacing existing schedules.

### getTask

```js
scheduler.getTask("task1");
```

### startTask

Start a registered task by name or instance. Repeating start while it has a future invocation keeps the same schedule.

```js
scheduler.startTask("HelloTask");
scheduler.start(task); // alias for startTask
```

### startTasks

A method to start a series of tasks at once, and both Array of name and Task are allowed.

### startAll

A method to start all tasks in task pool.

### stopTask

A method to stop a task schedule, and its usage is similar to addTask.

### stopTasks

A method to stop a series of tasks schedule, and its usage is similar to addTasks.

### stopAll

Call `await scheduler.stopAll()` from the shutdown handler to cancel future invocations and wait for this scheduler's active callbacks. Other modules' node-schedule jobs keep their schedules. A task callback should return before its host awaits shutdown, since shutdown waits for that callback too.

### removeTask

A method to remove a task from pool, and its usage is similar to addTask. If the task is alive, it will be canceld first by Scheduler and then be removed.

### removeTasks

A method to remove a series of tasks, and its usage is similar to addTasks.

### restartTask

A method to restart a task, and its usage is similar to addTask.

### restartTasks

A method to restart a series of tasks schedule, and its usage is similar to addTasks.

### rescheduleTask

Replace the rule of a registered task. These calls accept the name, the Task instance, or an object containing either. Omitting the rule reuses the current one. If a replacement cannot be scheduled, the call throws and the previous schedule remains active.

A bounded schedule accepts a rule with optional `start`, `end` and `tz`. Supply valid dates in chronological order, for example `{ rule: "0 9 * * *", tz: "Asia/Shanghai", end: new Date("2035-12-31") }`.

```js
scheduler.rescheduleTask("HelloTask", "*/5 * * * * *");
scheduler.rescheduleTask(task);
scheduler.rescheduleTask({ task, rule: "*/5 * * * * *" });
scheduler.rescheduleTask({ task: "HelloTask", rule: new Date(Date.now() + 5000) });
```

## ScheTool

```js
const { ScheTool } = require('@evanpatchouli/scheduler');
```

### dumpTaskPool
Remove all tasks and detach them from registered plans. The plans remain registered.
```js
ScheTool.dumpTaskPool();
```

## TaskHelper

Cache cleanup is shared and automatic. A normal registration now adds only the business task to the pool. Code that uses `getTask("name-helper")` can opt into a named helper by calling `Scheduler.registerHelper(task)` before starting the task. The standalone `new TaskHelper(task)` constructor is also available.

## Starter

```js
const { Starter } = require("@evanpatchouli/scheduler");
```

### run

`Starter.run()` starts all registered tasks. Pass `true` to print the logo. When a callback is supplied, its return value or Promise is returned to the caller.

```js
async function main(plan) {
    await Starter.run(false, async ({ plan }) => {
        PlanTool.addPlan(plan);
        PlanTool.startPlan(plan);
    }, { plan });

    process.once("SIGTERM", () => Scheduler.stopAll());
}
```
