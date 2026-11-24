import {gracefulShutdown} from 'node-schedule';
import Plan from './plan';
import Task, { RescheduleRequest, TaskRule } from './task';
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
      try {
        this.startTask(task);
      } catch (error) {
        this.removeTask(task);
        throw error;
      }
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
    this.stopTask(taskRef);
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
    this.getTask(`${taskRef.name}-helper`)?.start();
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
  rescheduleTask(request: RescheduleRequest, rule?: TaskRule | null) {
    const wrapped = typeof request === 'object' && 'task' in request;
    const task = this.getTask(wrapped ? request.task : request);
    if (!task) throw new Error('[Scheduler]Task to reschedule does not exist');
    task.reschedule(rule ?? (wrapped ? request.rule : undefined) ?? task.rule);
    this.getTask(`${task.name}-helper`)?.start();
  }
}

export default Scheduler.getInstance()
