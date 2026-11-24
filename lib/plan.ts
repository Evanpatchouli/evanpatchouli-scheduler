import Scheduler from './scheduler';
import Task, { RescheduleRequest, TaskRef, TaskRule, unpackSchedule } from './task';

export default class Plan {
  readonly task_group = new Map<string, Task>();

  constructor(public readonly name: string, tasks: readonly Task[] = []) {
    this.addTasks(tasks);
  }

  get alive() {
    for (const task of this.task_group.values()) {
      if (task.alive) return true;
    }
    return false;
  }

  getTask(ref: TaskRef) {
    const task = this.task_group.get(typeof ref === 'string' ? ref : ref.name);
    return typeof ref === 'string' || ref === task ? task : undefined;
  }

  private members(refs: readonly TaskRef[]) {
    return [...new Set(refs.map(ref => {
      const task = this.getTask(ref);
      if (!task) throw new Error(`[Scheduler][Plan:${this.name}]Unknown member "${typeof ref === 'string' ? ref : ref.name}"`);
      return task;
    }))];
  }

  private requireRegistration() {
    if (Scheduler.plan_pool.get(this.name) !== this) {
      throw new Error(`[Scheduler]Plan "${this.name}" is not registered`);
    }
  }

  addTask(task: Task) {
    this.addTasks([task]);
  }

  addTasks(tasks: readonly Task[]) {
    const additions = new Map<string, Task>();
    for (const task of tasks) {
      const existing = this.task_group.get(task.name) ?? additions.get(task.name);
      if (existing && existing !== task) throw new Error(`[Scheduler]Duplicate member "${task.name}"`);
      if (!existing) additions.set(task.name, task);
    }
    if (Scheduler.plan_pool.get(this.name) === this) {
      Scheduler.addTasks([...additions.values()].filter(task => !Scheduler.getTask(task)));
    }
    for (const task of additions.values()) this.task_group.set(task.name, task);
  }

  removeTask(ref: TaskRef) {
    this.removeTasks([ref]);
  }

  removeTasks(refs: readonly TaskRef[]) {
    const members = this.members(refs);
    const registered = Scheduler.plan_pool.get(this.name) === this;
    for (const task of members) {
      if (!this.task_group.delete(task.name)) continue;
      if (registered && ![...Scheduler.plan_pool.values()].some(plan => plan.getTask(task))) {
        Scheduler.removeTask(task);
      }
    }
  }

  start() { this.startTasks([...this.task_group.values()]); }
  stop() { this.stopTasks([...this.task_group.values()]); }
  restart() { this.restartTasks([...this.task_group.values()]); }

  startTask(ref: TaskRef) { this.startTasks([ref]); }
  stopTask(ref: TaskRef) { this.stopTasks([ref]); }
  restartTask(ref: TaskRef) { this.restartTasks([ref]); }

  startTasks(refs: readonly TaskRef[]) {
    this.requireRegistration();
    Scheduler.startTasks(this.members(refs));
  }

  stopTasks(refs: readonly TaskRef[]) {
    this.requireRegistration();
    Scheduler.stopTasks(this.members(refs));
  }

  restartTasks(refs: readonly TaskRef[]) {
    this.requireRegistration();
    Scheduler.restartTasks(this.members(refs));
  }

  rescheduleTask(request: RescheduleRequest, rule?: TaskRule | null) {
    this.requireRegistration();
    const args = unpackSchedule(request, rule);
    const [member] = this.members([args.task]);
    Scheduler.rescheduleTask(member, args.rule);
  }
}
