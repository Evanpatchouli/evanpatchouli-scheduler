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
- [Warning](#warnning)

## Task

```js
const { Task } = require("@evanpatchouli/scheduler");
```

### create a Task

By Task constructor, you should give 4 params:
- name : Task name
- rule : the rule which Task is scheduled by, and it's same as the rule in "node-schedule"
- todo : the things Task going to do
```js
const task = new Task("HelloTask", "* * * * * *", ()=>{
    console.log("Hello, there is Scheduler");
})
```
- options : it can contain `logOn` and `cacheOn`
```js
const task = new Task("HelloTask", "* * * * * *", ()=>{
    console.log("Hello, there is Scheduler", {logOn: false, cacheOn:false});
})
```
If you don't give the options of options only have all attributes, true will be default logOn and false will be default cacheOn.  
Look at the following example, this task.logOn will be true and its cacheOn will be false.
```js
const task = new Task("HelloTask", "* * * * * *", ()=>{
    console.log("Hello, there is Scheduler", {cacheOn:false});
})
```

Although Task has many other methods, please do not use them directly by Task. You should use **Scheduler** or **Plan** or **PlanTool** or **ScheTool** to manage your tasks unless you want to manage tasks yourself without Scheduler.

## Plan

You can put a group of task into a plan and manage them by plan. Before you really start a plan, you **must** use **PlanTool.addPlan** to add this plan into Scheduler.plan_pool.
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
Plan.getTask("task1");
```

### remove a task from a plan

the param could be of Task or Task.name
```js
plan.removeTask(task1);
plan.removeTask("task1");   //"task1" is the name of task1
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

Only restart one certain task in plan.The task could be Task.name or Task
```js
plan.startTask(task1);
```

### restartTasks

Only start some tasks in plan
```js
plan.startTasks([task1,"task2"]);
```

### rescheduleTask

Restart one certain task in plan. The usage is similar to **Scheduler.rescheduleTask**
```js
plan.startTask(task1,"* * * * * *");
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
Stop a plan though PlanTool, the param chould be name or Plan
```js
PlanTool.startPlan(plan);
```

### stopPlan
Stop a plan though PlanTool, the param chould be name or Plan
```js
PlanTool.stopPlan(plan);
```

### removePlan
Stop and remove a plan though PlanTool, the param chould be name or Plan
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
It is just be add into task pool without being started. If you want to start the task as soon as it is added, do like this:
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
You can also give the second param as true to make all of them to start at once.  
In future, this method may support to appoint every task whether to start or not.

### getTask

```js
scheduler.getTask("task1");
```

### startTask

If a task is not running(hasn't been started or has been stoped), use startTask can start it at once.
```js
scheduler.start("HelloTask");
```
Or
```js
const task = new Task("HelloTask", "* * * * * *", ()=>{
    console.log("Hello, there is Scheduler");
})
scheduler.start(task);
```
Both name and Task are allowed.

### startTasks

A method to start a series of tasks at once, and both Array of name and Task are allowed.

### startAll

A method to start all tasks in task pool.

### stopTask

A method to stop a task schedule, and its usage is similar to addTask.

### stopTasks

A method to stop a series of tasks schedule, and its usage is similar to addTasks.

### stopAll

A method to stop all tasks in task pool.

### removeTask

A method to remove a task from pool, and its usage is similar to addTask. If the task is alive, it will be canceld first by Scheduler and then be removed.

### removeTasks

A method to remove a series of tasks, and its usage is similar to addTasks.

### restartTask

A method to restart a task, and its usage is similar to addTask.

### restartTasks

A method to restart a series of tasks schedule, and its usage is similar to addTasks.

### rescheduleTask

A method to reschedule a task(Only reset rule, will not reset todo).  
You can use it like:
```js
scheduler.rescheduleTask("HelloTask","*\5 * * * * *");
```
Or
```js
const task = new Task("HelloTask", "*\5 * * * * *", ()=>{})
scheduler.rescheduleTask(task);
```
Or
```js
const task = new Task("HelloTask", "*\5 * * * * *", ()=>{})
scheduler.rescheduleTask({task: task});
```
Or
```js
const task = new Task("HelloTask", "* * * * * *", ()=>{})
scheduler.rescheduleTask({task: task, rule: "*\5 * * * * *"});
```
Or
```js
scheduler.rescheduleTask({task: "HelloTask", rule: "* * * * * *"});
```
When you both give task<Task> and rule ( rescheduleTask({task,rule}) or rescheduleTask(task,rule) ), if rule is null or undefind, Scheduler will use task.rule to reschedule it.
### rescheduleTasks

(Unaccomplished) A method to reschedule a series of tasks schedule.

## ScheTool

```js
const { ScheTool } = require('@evanpatchouli/scheduler');
```

### dumpTaskPool
Remove all tasks without care about dumpPlans
```js
ScheTool.dumpTaskPool();
```

## TaskHelper

Every task added into pool, Scheduler will auto rigister an one-to-one Task named `${task.name}-helper` to help manage this task, release cache regularly...  
And TaskHelper's logOn and cacheOn will be same with the task it helps.

## Starter

```js
const { Starter } = require("@evanpatchouli/scheduler");
```

A module provides packaged functions to init and start Scheduler and it can print `Scheduler` Logo in consle at fitst time.

### run

Starter.run(isLogo, todo, params):
- isLogo : whether to ptint `Scheduler` Logo, if you don't want to print Logo, you can give `false` or not give any param.
- a function packaged with the things you want to do
- if todo needs params, please make them to `k-v` object

Example
```js
let params = {
    plan,task1,task2
}
Starter.run(true, todo, params);
function todo(params) {
    setTimeout(()=>{PlanTool.startPlan(params.plan);},5000);
    setTimeout(()=>{Scheduler.stopAll();},20000);
}
```

### !Warnning
if you start task or plan in todo,must avoid to do actions of start/stop... by Scheduler/PlanTool/ScheTool at once, because js is single thread, if you have to do, please use setTimeout to create enough time delay between Starter and your outer star/stop/dump action code.