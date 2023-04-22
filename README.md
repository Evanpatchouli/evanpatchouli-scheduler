# @evanpatchouli/scheduler
A package help to manage the transcations scheduled in node.js.  
This frame is based on **node-schedule**,which thanks for the grate work the team of.

## Install

```shell
npm install @evanpatchouli/scheduler
```

## Latest Version

**v1.1.0**: 
- Since this version, the class **Job** and **JobHelper** have been refactored to **Task** and **TaskHelper**.
- Besides, there is a new mechanism with a new class **Plan**, where you can put several related Tasks into it. Altought it is in development so it is of useless at this version, but it will works at next version.
- Fix 1 bug in JobHelper(now named TaskHelper).

## Task

```js
const { Task } = require("@evanpatchouli/scheduler");
```

### create a Task

By Task constructor, you should give 3 params:
- name : Task name
- rule : the rule which Task is scheduled by, and it's same as the rule in "node-schedule"
- todo : the things Task going to do
```js
const task = new Task("HelloTask", "* * * * * *", ()=>{
    console.log("Hello, there is Scheduler");
})
```
Although Task has many other methods, please do not use them directly by Task. You should use **Scheduler** to manage your tasks unless you want to manage tasks yourself without Scheduler.

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

## TaskHelper

Every task added into pool, Scheduler will auto rigister an one-to-one Task named `${task.name}-helper` to help manage this task, release cache regularly...
## Starter

```js
const { Starter } = require("@evanpatchouli/scheduler");
```

A module provides packaged functions to init and start Scheduler and it can print `Scheduler` Logo in consle at fitst time.

```js
let scheduler = Scheduler.getInstance();
const tasktest = new Task("tasktest","* * * * * *",()=>{console.log("Go!")});
scheduler.addTask(tasktest);
ScheduleStarter.run(true);
```
If you don't want to print Logo, you can give `false` or not give any param.
