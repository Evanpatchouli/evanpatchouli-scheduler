const schedule = require('node-schedule');
const { default: Plan } = require('./plan');
const Task = require('./task');
const TaskHelper = require('./taskHelper');

/**
 * @instance This is a single instance object
 * @typeof {Scheduler}
 */
class Scheduler {
    name = "Scheduler";
    constructor() {
        this.instance = null;
        /**
         * @type {Map<string,Task>}
         */
        this.task_pool = new Map();
        /**
         * @type {Map<string,Plan>}
         */
        this.plan_pool = new Map();
    }
    /**
     * Get instance
     * @returns {Scheduler}
     */
    static getInstance() {
        if (this.instance) {
            return this.instance;
        } else {
            this.instance = new Scheduler();
        }
        return this.instance;
    }
    /**
     * Start all tasks
     */
    startAll() {
        console.log("[Scheduler]Going to start all tasks...");
        for (const task of this.task_pool.values()) {
            // if (!task.name.endsWith("-helper")) {
            //     task.start();
            // }
            task.start();
        }
        console.log("[Scheduler]All tasks have been started");
    }
    /**
     * Start a task as well its helper
     * @param {string|Task} task
     */
    startTask(task) {
        switch (typeof (task)) {
            case 'object':
                this.task_pool.get(task.name).start();
                this.task_pool.get(`${task.name}-helper`).start();
                break;
            case 'string':
                this.task_pool.get(task).start();
                this.task_pool.get(`${task}-helper`).start();
                break;
            default:
                break;
        }
    }
    /**
     * Start a task as well its helper
     * @param {Array<string|Task>} tasks
     */
    startTasks(tasks) {
        for (const task of object) {
            this.startTask(task);
        }
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
    /**
     * Stop all tasks
     */
    stopAll() {
        console.log("[Scheduler]Going to shutdown all tasks...");
        schedule.gracefulShutdown();
        console.log("[Scheduler]All tasks have been shutdown gracefully");
    }
    /**
     * Add a task and you can deside whether to start it right now
     * @param {Task} task
     * @param {boolean} isToStart
     */
    addTask(task, isToStart) {
        this.task_pool.set(task.name, task);
        this.registerHelper(task);
        if (arguments.length == 2 && isToStart == true) {
            this.task_pool.get(task.name).start();
            this.task_pool.get(`${task.name}-helper`).start();
        }
    }
    registerHelper(task) {
        const task_helper = new TaskHelper(task);
        this.task_pool.set(`${task.name}-helper`, task_helper);
    }
    /**
     * Add a series of tasks and you can deside whether to start them right now
     * @param {Array<Task>} tasks
     * @param {boolean} isToStart
     */
    addTasks(tasks, isToStart) {
        for (const task of tasks) {
            this.addTask(task, arguments.length >= 2 ? isToStart : false);
        }
    }
    /**
     * Stop one certain task
     * @param {string|Task} task
     */
    stopTask(task) {
        switch (typeof (task)) {
            case 'object':
                this.task_pool.get(task.name).stop();
                this.task_pool.get(`${task.name}-helper`).stop();
                break;
            case 'string':
                this.task_pool.get(task).stop();
                this.task_pool.get(`${task}-helper`).stop();
                break;
            default:
                break;
        }
    }
    /**
     * Stop a series of certain tasks
     * @param {Array<string>|Array<Task>} tasks
     */
    stopTasks(tasks) {
        for (const task of tasks) {
            this.stopTask(task);
        }
    }
    /**
     * Remove one certain task
     * @param {string|Task} task
     */
    removeTask(task) {
        switch (typeof (task)) {
            case 'object':
                if (this.task_pool.get(task.name).alive) {
                    this.stopTask(task);
                }
                this.task_pool.delete(task.name);
                this.task_pool.delete(`${task.name}-helper`);
                break;
            case 'string':
                if (this.task_pool.get(task).alive) {
                    this.stopTask(task);
                }
                this.task_pool.delete(task);
                this.task_pool.delete(`${task}-helper`);
                break;
            default:
                break;
        }
    }
    /**
     * Remove a series of certain tasks
     * @param {Array<string>|Array<Task>} tasks
     */
    removeTasks(tasks) {
        for (const task of tasks) {
            this.removeTask(task);
        }
    }
    /**
     * Restart a task
     * @param {Task|string} task
     */
    restartTask(task) {
        this.task_pool.get(typeof (task) == 'string' ? task : task.name).restart();
    }
    /**
     * Restart a series of tasks
     * @param {Array<string>|Array<Task>} tasks
     */
    restartTasks(tasks) {
        for (const task of tasks) {
            this.restartTask(task);
        }
    }
    /**
     * Reschedule one certain task
     * @param {{task:string,rule:string|schedule.RecurrenceRule|Date|{}}|Task} task
     * @param {string|schedule.RecurrenceRule|Date|{}} rule
     */
    rescheduleTask(task, rule) {
        if (arguments.length == 1) {
            if (arguments[0] instanceof Task) {
                this.task_pool.get(task.name).reschedule(task.rule);
                this.restartTask(`${task.name}-helper`);
            }
            if (arguments[0] instanceof { task }) {
                this.task_pool.get(arguments[0].task.name).reschedule(arguments[0].task.rule);
                this.restartTask(`${arguments[0].task.name}-helper`);
            }
            if (arguments[0] instanceof { task, rule }) {
                switch (typeof arguments[0].task) {
                    case 'object':
                        if (arguments[0].rule != undefined || arguments[0].rule != null) {
                            this.task_pool.get(arguments[0].task.name).reschedule(arguments[0].rule);
                        } else {
                            this.task_pool.get(arguments[0].task.name).reschedule(arguments[0].task.rule);
                        }
                        this.restartTask(`${arguments[0].task.name}-helper`);
                        break;
                    case 'string':
                        this.task_pool.get(arguments[0].task).reschedule(arguments[0].rule);
                        this.restartTask(`${arguments[0].task}-helper`);
                        break;
                    default:
                        break;
                }
            }
        }
        if (arguments.length == 2) {
            switch (typeof task) {
                case 'object':
                    this.task_pool.get(task.name).reschedule((rule != null || rule != undefined) ? rule : task.rule);
                    this.task_pool.get(`${task.name}-helper`).restart();
                    break;
                case 'string':
                    this.task_pool.get(task).reschedule(rule);
                    this.task_pool.get(`${task}-helper`).restart();
                    break;
                default:
                    break;
            }
        }
    }
}

















module.exports = Scheduler;
