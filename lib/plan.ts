import schedule from 'node-schedule';
import Scheduler from './scheduler';
import Task from './task';

class Plan {
  public alive: boolean = false;
  public task_group = new Map<string,Task>();

  constructor(public name: string, tasks: Task[]) {
    if (tasks!=undefined&&tasks.length!=0) {
      tasks.forEach(task => {
        this.task_group.set(task.name, task);
        Scheduler.addTask(task);
      });
    }
  }

  /**
   * Start all tasks of this plan
   */
  start() {
    console.log(`[Scheduler][Plan:${this.name}]Plan is going to start...`);
    this.task_group.forEach(task => {
      Scheduler.startTask(task.name);
    });
    console.log(`[Scheduler][Plan:${this.name}]Plan has started successfully`);
  }

  /**
   * Stop all tasks of this plan
   */
  stop() {
    console.log(`[Scheduler][Plan:${this.name}]Plan is going to stop...`);
    this.task_group.forEach(task => {
        Scheduler.stopTask(task.name);
    });
    console.log(`[Scheduler][Plan:${this.name}]Plan has stopped successfully`);
  }

  /**
   * Add a task into this plan
   * @param {Task} task 
   */
  addTask(task: Task) {
    this.task_group.set(task.name, task);
    Scheduler.addTask(task);
  }

  /**
   * Remove and stop a task from this plan
   * @param {Task|string} task 
   */
  removeTask(task: Task|string){
    switch (typeof task) {
      case 'object':
        this.task_group.delete(task.name);
        break;
      case 'string':
        this.task_group.delete(task);
      default:
        break;
    }
    Scheduler.removeTask(task);
  }

  /**
   * Add a series of tasks into this plan
   * @param {Task[]} tasks
   */
  addTasks(tasks: Task[]){
    if (tasks!=undefined&&tasks.length!=0) {
      tasks.forEach(task => {
        this.addTask(task);
      });
    }
  }

  /**
   * Get a task by its name or self
   * @param task task's name or self
   * @returns 
   */
  getTask(task: Task|string) {
    switch (typeof task) {
      case 'object':
        return this.task_group.get(task.name);
      default:
        return this.task_group.get(task);
    }
  }

  /**
   * Remove and stop a series of tasks from this plan
   * @param {Task[]|string[]} tasks
   */
  removeTasks(tasks: Task[]|string[]){
    if (tasks!=undefined&&tasks.length!=0) {
      tasks.forEach(task => {
          this.removeTask(task);
      });
    }    
  }

  /**
   * Start one task of this plan
   * @param {Task|string} task 
   */
  startTask(task: Task|string) {
    let taskRef = this.getTask(task);
    if (!taskRef) {
      throw new Error(`[Scheduler][Plan:${this.name}]Task ${task} dose not exist`);
    }
    console.log(`[Scheduler][Plan:${this.name}]Plan is going to start [Job:${taskRef.name}]...`);
    Scheduler.startTask(task);
  }

  /**
   * Start a series tasks of this plan
   * @param {Task[]|string[]} tasks 
   */
  startTasks(tasks: Task[]|string[]) {
    Scheduler.startTasks(tasks);
  }

  /**
   * Stop one task of this plan
   * @param {Task|string} task 
   */
  stopTask(task: Task|string) {
    let taskRef = this.getTask(task);
    if (!taskRef) {
      throw new Error(`[Scheduler][Plan:${this.name}]Task "${task}" dose not exist`);
    }
    console.log(`[Scheduler][Plan:${this.name}]Plan is going to stop [Job:${taskRef.name}]...`);
    Scheduler.stopTask(task);
  }

  /**
   * Stop some tasks of this plan
   * @param {Task[]|string[]} tasks 
   */
  stopTasks(tasks: Task[]|string[]) {
    Scheduler.stopTasks(tasks);
  }

  /**
   * Restart all tasks of this plan
   */
  restart() {
    console.log(`[Scheduler][Plan:${this.name}]Plan is going to restart...`);
    this.task_group.forEach(task => {
      Scheduler.restartTask(task.name);
    });
    console.log(`[Scheduler][Plan:${this.name}]Plan has restarted successfully`);
  }

  /**
   * Restart one of task of this plan
   * @param {Task|string} task 
   */
  restartTask(task: Task|string) {
    let taskRef = this.getTask(task);
    if (!taskRef) {
      throw new Error(`[Scheduler][Plan:${this.name}]Task ${task} dose not exist`);
    }
    console.log(`[Scheduler][Plan:${this.name}]Plan is going to restart [Task:${taskRef.name}]...`);
    Scheduler.restartTask(task);
  }

  /**
   * Restart some tasks of this plan
   * @param {Task[]|string[]} tasks 
   */
  restartTasks(tasks: Task[]|string[]) {
    Scheduler.restartTasks(tasks);
  }

  /**
   * Reschedule one task of this plan
   * @param {{task:string,rule:string|schedule.RecurrenceRule|Date|{}}|Task} task
   * @param {string|schedule.RecurrenceRule|Date|{}} rule
   */
  rescheduleTask(task: string, rule: string|schedule.RecurrenceRule|Date|{}) {
    Scheduler.rescheduleTask(task, rule);
  }

}

export default Plan;