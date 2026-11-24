import Plan from './plan';
import Task, { RescheduleRequest, TaskRef, TaskRule, unpackSchedule } from './task';
import TaskHelper from './task.helper';

export class Scheduler {
  private static readonly instance = new Scheduler();
  private readonly draining = new Set<Promise<void>>();
  readonly name = 'scheduler';
  readonly task_pool = new Map<string, Task>();
  readonly plan_pool = new Map<string, Plan>();

  private constructor() {}

  static getInstance() {
    return Scheduler.instance;
  }

  printAll() {
    for (const name of this.task_pool.keys()) console.log(`[Scheduler]Task: ${name}`);
  }

  getTask(ref: TaskRef) {
    const task = this.task_pool.get(typeof ref === 'string' ? ref : ref.name);
    return typeof ref === 'string' || task === ref ? task : undefined;
  }

  private requireTask(ref: TaskRef) {
    const task = this.getTask(ref);
    if (!task) throw new Error(`[Scheduler]Unknown task "${typeof ref === 'string' ? ref : ref.name}"`);
    return task;
  }

  private resolveTasks(refs: readonly TaskRef[]) {
    return [...new Set(refs.map(ref => this.requireTask(ref)))];
  }

  addTask(task: Task, start = false) {
    this.addTasks([task], start);
  }

  addTasks(tasks: readonly Task[], start = false) {
    const names = new Set<string>();
    for (const task of tasks) {
      if (!task.name.trim() || task.name.endsWith('-helper')) {
        throw new Error(`[Scheduler]Invalid task name "${task.name}"`);
      }
      if (names.has(task.name) || this.task_pool.has(task.name)) {
        throw new Error(`[Scheduler]Duplicate task "${task.name}"`);
      }
      names.add(task.name);
    }
    const added: Task[] = [];
    try {
      for (const task of tasks) {
        this.task_pool.set(task.name, task);
        added.push(task);
        this.registerHelper(task);
      }
      if (start) this.startTasks(tasks);
    } catch (error) {
      for (const task of added) this.removeTask(task);
      throw error;
    }
  }

  registerHelper(task: Task) {
    const name = `${task.name}-helper`;
    if (!this.task_pool.has(name)) this.task_pool.set(name, new TaskHelper(task));
  }

  startTask(ref: TaskRef) {
    const task = this.requireTask(ref);
    task.start();
    this.getTask(`${task.name}-helper`)?.start();
  }

  startTasks(refs: readonly TaskRef[]) {
    const tasks = this.resolveTasks(refs);
    const started: Task[] = [];
    try {
      for (const task of tasks) {
        if (!task.alive) started.push(task);
        this.startTask(task);
      }
    } catch (error) {
      for (const task of started) this.stopTask(task);
      throw error;
    }
  }

  startAll() {
    this.startTasks([...this.task_pool.values()]);
  }

  stopTask(ref: TaskRef) {
    const task = this.requireTask(ref);
    task.stop();
    this.getTask(`${task.name}-helper`)?.stop();
  }

  stopTasks(refs: readonly TaskRef[]) {
    for (const task of this.resolveTasks(refs)) this.stopTask(task);
  }

  async stopAll(): Promise<void> {
    const pending = [...this.draining];
    for (const task of this.task_pool.values()) {
      task.stop();
      if (task.runningCount) pending.push(task.waitForIdle());
    }
    await Promise.all(pending);
  }

  removeTask(ref: TaskRef) {
    const task = this.requireTask(ref);
    this.stopTask(task);
    for (const plan of this.plan_pool.values()) plan.task_group.delete(task.name);
    for (const owned of [task, this.getTask(`${task.name}-helper`)]) {
      if (!owned) continue;
      this.task_pool.delete(owned.name);
      if (owned.runningCount) {
        const completion = owned.waitForIdle();
        this.draining.add(completion);
        void completion.then(() => this.draining.delete(completion));
      }
    }
  }

  removeTasks(refs: readonly TaskRef[]) {
    for (const task of this.resolveTasks(refs)) {
      if (this.getTask(task)) this.removeTask(task);
    }
  }

  dumpTasks() {
    this.removeTasks([...this.task_pool.values()]);
    this.plan_pool.clear();
  }

  restartTask(ref: TaskRef) {
    const task = this.requireTask(ref);
    task.restart();
    this.getTask(`${task.name}-helper`)?.start();
  }

  restartTasks(refs: readonly TaskRef[]) {
    for (const task of this.resolveTasks(refs)) this.restartTask(task);
  }

  rescheduleTask(request: RescheduleRequest, rule?: TaskRule | null) {
    const args = unpackSchedule(request, rule);
    const task = this.requireTask(args.task);
    task.reschedule(args.rule ?? task.rule);
    this.getTask(`${task.name}-helper`)?.start();
  }
}

export default Scheduler.getInstance();
