const Task = require("./task");

class Plan{
    alive = false;
    /**
     * @type {Map<string,Task>}
     */
    task_group = new Map();

    /**
     * 
     * @param {string} name 
     * @param {Task[]} tasks 
     */
    constructor(name, tasks){
        this.name = name;
        tasks.forEach(task => {
            this.task_group.set(task.name, task);
        });
    }
}

module.exports = {
    default: Plan
}