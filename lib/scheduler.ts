import {gracefulShutdown,RecurrenceRule} from 'node-schedule';
import Plan from './plan';
import Task from './task';
import TaskHelper from './task.helper';
import PlanTool from './plan.tool';
import ScheTool from './sche.tool';

/**
 * 
 */
class Scheduler {
  name: string;
  static instance: Scheduler|null = null;
  task_pool: Map<string,Task>;
  plan_pool: Map<string,Plan>;

  constructor() {
    this.name = 'scheduler';
    Scheduler.instance = null;
    this.task_pool = new Map();
    this.plan_pool = new Map();
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new Scheduler();
    }
    return this.instance;
  }

  /**
   * Print name of all tasks
   */
  printAll() {
    console.log("[Scheduler]Going to print name of all tasks...");
    let i = 0;
    for (const task of this.task_pool.values()) {
        console.log(`[Scheduler]Task:${++i}:${task.name}`);
    }
  }

  startAll() {
    console.log("[Scheduler]Going to start all tasks...");
    for (const task of this.task_pool.values()) {
      if (!task.alive) {
        task.start();
      } 
    }
    console.log("[Scheduler]All tasks have been started");
  }

  startTask(task: Task|string) {
    let taskRef;
    switch (typeof task) {
      case 'string':{
        taskRef = this.task_pool.get(task);
        break;
      }
      case 'object':{
        taskRef = this.task_pool.get(task.name);
        break;
      }
      default: break;
    }
    if (!taskRef) {
      throw new Error("[Scheduler]The task does not exist")
    }
    taskRef.start();
    this.task_pool.get(`${taskRef.name}-helper`)?.start();
  }

  /**
   * Start a task as well its helper
   * @param {Array<string>|Array<Task>} tasks
   */
  startTasks(tasks:Array<string>|Array<Task>) {
    for (const task of tasks) {
      this.startTask(task);
    }
  }

  /**
   * Stop all tasks
   */
  stopAll() {
    console.log("[Scheduler]Going to shutdown all tasks...");
    gracefulShutdown();
    console.log("[Scheduler]All tasks have been shutdown gracefully");
  }

  /**
   * Add a task and you can deside whether to start it right now
   * @param {Task} task
   * @param {boolean|undefined} isToStart
   */
  addTask(task: Task, isToStart?: boolean) {
    this.task_pool.set(task.name, task);
    this.registerHelper(task);
    if (isToStart == true) {
      this.task_pool.get(task.name)?.start();
      this.task_pool.get(`${task.name}-helper`)?.start();
    }
  }

  registerHelper(task: Task) {
    const task_helper = new TaskHelper(task);
    this.task_pool.set(`${task.name}-helper`, task_helper);
  }

  /**
   * Add a series of tasks and you can deside whether to start them right now
   */
  addTasks(tasks: Task[], isToStart?: boolean) {
    for (const task of tasks) {
      this.addTask(task, isToStart??false);
    }
  }

  /**
   * Get a task from the pool by name or task
   * @param task 
   * @returns 
   */
  getTask(task: Task|string) {
    let key: string;
    switch (typeof task) {
      case 'object':
        key = task.name;
        break;
      default:
        key = task;
        break;
    }
    return this.task_pool.get(key);
  }

  /**
   * Stop one certain task
   * @param {string|Task} task
   */
  stopTask(task: string|Task) {
    let taskRef = this.getTask(task);
    if (!taskRef) {
      switch (typeof task) {
        case "object":
          throw new Error(`[Scheduler]Task "${task.name}" to stop does not exist`);
        default:
          throw new Error(`[Scheduler]Task "${task}" to stop does not exist`);
      }
    }
    taskRef.stop();
    this.getTask(`${taskRef.name}-helper`)?.stop();
  }
  /**
   * Stop a series of certain tasks
   * @param {string[]|Task[]} tasks
   */
  stopTasks(tasks: string[]|Task[]) {
    for (const task of tasks) {
      this.stopTask(task);
    }
  }
  /**
   * Remove one certain task
   * @param {string|Task} task
   */
  removeTask(task: string | Task) {
    let taskRef = this.getTask(task);
    if (!taskRef) {
      switch (typeof task) {
        case "object":
          throw new Error(`[Scheduler]Task ${task.name} to removed does not exist`);
        default:
          throw new Error(`[Scheduler]Task ${task} to removed does not exist`);
      }
    }
    if (taskRef.alive) {
      this.stopTask(taskRef);
    }
    this.task_pool.delete(taskRef.name);
    this.task_pool.delete(`${taskRef.name}-helper`);
  }

  /**
   * Remove a series of certain tasks
   * @param {string[]|Task[]} tasks
   */
  removeTasks(tasks: string[] | Task[]) {
    for (const task of tasks) {
      this.removeTask(task);
    }
  }

  /**
   * Remove all tasks
   */
  dumpTasks() {
    // first dump plans
    PlanTool.dumpPlans();
    // then dump other wild tasks
    ScheTool.dumpTaskPool();
  }

  /**
   * Restart a task
   * @param {Task|string} task
   */
  restartTask(task: Task|string) {
    let taskRef = this.getTask(task);
    if (!taskRef) {
      switch (typeof task) {
        case "object":
          throw new Error(`[Scheduler]Task ${task.name} to restart does not exist`);
        default:
          throw new Error(`[Scheduler]Task ${task} to restart does not exist`);
      }
    }
    taskRef.restart();
  }
  /**
   * Restart a series of tasks
   * @param {string[]|Task[]} tasks
   */
  restartTasks(tasks: string[]|Task[]) {
    for (const task of tasks) {
      this.restartTask(task);
    }
  }
  /**
   * Reschedule one certain task
   * @param {{task:string,rule:string|RecurrenceRule|Date|number|{[x:string]:any}}|Task|string} task
   * @param {string|schedule.RecurrenceRule|Date|number|{[x:string]:any}} rule
   */
  rescheduleTask(task: {task:string,rule?:string|RecurrenceRule|Date|number|{[x:string]:any}}|Task|string, rule?: string|RecurrenceRule|Date|number|{[x:string]:any}) {
      class RescheArg1 {
        task: string|Task = '';
        rule?: string|RecurrenceRule|Date|number|{[x:string]:any}
      }
      let taskRef: Task|undefined;
      let rescheRule;
      let taskHelperRef:  Task|undefined;
      const arg1: {task:string|Task,rule?:string|RecurrenceRule|Date|number|{[x:string]:any}}|Task|string = arguments[0];
      if (arg1 instanceof RescheArg1) {
        taskRef = this.getTask(arg1.task);
        if (!arg1.rule) {
          if (taskRef) {
            rescheRule = taskRef.rule;
          }
        } else {
          rescheRule = arg1.rule;
        }
      }
      else if (arg1 instanceof Task) {
        taskRef = this.getTask(arg1);
        if (taskRef) {
          rescheRule = taskRef.rule;
        }
        this.restartTask(`${arg1.name}-helper`);
      }
      else if (typeof arg1 == 'string') {
        taskRef = this.getTask(arg1);
      }
      if (arguments.length == 2) {
        rescheRule = rule;
      }
      if (!taskRef) {
        throw new Error(`[Scheduler]Task ${task} to reschedule does not exist`)
      }
      if (!rescheRule) {
        rescheRule = taskRef.rule;
      }
      taskHelperRef = this.getTask(`${taskRef.name}-helper`);
      taskRef.reschedule(rescheRule);
      taskHelperRef?.restart();
  }
}

export default Scheduler.getInstance()