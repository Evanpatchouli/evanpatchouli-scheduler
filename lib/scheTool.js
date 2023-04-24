/**
 * Remove all tasks without care about plans
 */
function dumpTaskPool() {
    let Scheduler = require("./scheduler");
    for (const task of Scheduler.task_pool.values()) {
        Scheduler.removeTask(task);
    }
}


module.exports = {
    dumpTaskPool
}