import Scheduler from "./scheduler";

/**
 * Remove all tasks without care about plans
 */
export function dumpTaskPool() {
  for (const task of Scheduler.task_pool.values()) {
    Scheduler.removeTask(task);
  }
}

export default {
  dumpTaskPool
}
