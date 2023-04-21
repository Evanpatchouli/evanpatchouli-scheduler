# @evanpatchouli/scheduler
 A package help to manage the transcations scheduled in node.js

## Install

```shell
npm install @evanpatchouli/scheduler
```

## Job

```js
const { Job } = require("@evanpatchouli/scheduler");
```

### create a Job

By Job constructor, you should give 3 params:
- name : Job name
- rule : the rule which Job is scheduled by, and it's same as the rule in "node-schedule"
- todo : the things Job going to do
```js
const job = new Job("HelloJob", "* * * * * *", ()=>{
    console.log("Hello, there is Scheduler");
})
```
Although Job has many other methods, please do not use them directly by Job. You should use **Scheduler** to manage your jobs unless you want to manage jobs yourself without Scheduler.

## Scheduler

```js
const { Scheduler } = require("@evanpatchouli/scheduler");
```

The manager, a singleton, for you to manage your jobs like add, start, stop, restart, remove...

### getInstance
```js
let scheduler = Scheduler.getInstance();
```

### addJob

Add a new job into job pool, the name of job **must be unique and does not ends with "-helper"**
```js
const job = new Job("HelloJob", "* * * * * *", ()=>{
    console.log("Hello, there is Scheduler");
})
scheduler.addJob(job);
```
It is just be add into job pool without being started. If you want to start the job as soon as it is added, do like this:
```js
scheduler.addJob(job, true);
```

### addJobs

You can use **addJobs** to add a series of Jobs into job pool
```js
const job1 = new Job("HelloJob1", "* * * * * *", ()=>{
    console.log("Hello, there is Scheduler");
})
const job2 = new Job("HelloJob2", "* * * * * *", ()=>{
    console.log("Hello, there is Scheduler");
})
scheduler.addJobs([job1,job2]);
```
You can also give the second param as true to make all of them to start at once.  
In future, this method may support to appoint every job whether to start or not.

### startJob

If a job is not running(hasn't been started or has been stoped), use startJob can start it at once.
```js
scheduler.start("HelloJob");
```
Or
```js
const job = new Job("HelloJob", "* * * * * *", ()=>{
    console.log("Hello, there is Scheduler");
})
scheduler.start("HelloJob");
```
Both name and Job are allowed.

### startJobs

A method to start a series of jobs at once, and both Array of name and Job are allowed.

### startAll

A method to start all jobs in job pool.

### stopJob

A method to stop a job schedule, and its usage is similar to addJob.

### stopJobs

A method to stop a series of jobs schedule, and its usage is similar to addJobs.

### stopAll

A method to stop all jobs in job pool.

### removeJob

A method to remove a job from pool, and its usage is similar to addJob. If the job is alive, it will be canceld first by Scheduler and then be removed.

### removeJobs

A method to remove a series of jobs, and its usage is similar to addJobs.

### restartJob

A method to restart a job, and its usage is similar to addJob.

### restartJobs

A method to restart a series of jobs schedule, and its usage is similar to addJobs.

### rescheduleJob

A method to reschedule a job(Only reset rule, will not reset todo).  
You can use it like:
```js
scheduler.rescheduleJob("HelloJob","*\5 * * * * *");
```
Or
```js
const job = new Job("HelloJob", "*\5 * * * * *", ()=>{})
scheduler.rescheduleJob(job);
```
Or
```js
const job = new Job("HelloJob", "*\5 * * * * *", ()=>{})
scheduler.rescheduleJob({job: job});
```
Or
```js
const job = new Job("HelloJob", "* * * * * *", ()=>{})
scheduler.rescheduleJob({job: job, rule: "*\5 * * * * *"});
```
```
Or
```js
scheduler.rescheduleJob({job: "HelloJob", rule: "* * * * * *"});
```
When you both give job<Job> and rule ({job,rule} or (job,rule)), if rule is null or undefind, Scheduler will use job.rule to reschedule it.
### rescheduleJobs

## JobHelper

Every job added into pool, Scheduler will auto rigister an one-to-one Job named `${job.name}-helper` to help manage this job, release cache regularly...

A method to reschedule a series of jobs schedule.
## Starter

```js
const { Starter } = require("@evanpatchouli/scheduler");
```

A module provides packaged functions to init and start Scheduler and it can print `Scheduler` Logo in consle at fitst time.

```js
let scheduler = Scheduler.getInstance();
const jobtest = new Job("jobtest","* * * * * *",()=>{console.log("Go!")});
scheduler.addJob(jobtest);
ScheduleStarter.run(true);
```
If you don't want to print Logo, you can give `false` or not give any param.
