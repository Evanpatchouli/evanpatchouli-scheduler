const schedule = require('node-schedule');
const Task = require("./task");

class Plan{
    alive = false;
    /**
     * @type {Map<string,Task>}
     */
    task_group = new Map();

    /**
     * Constructor with name and task array.
     * @param {string} name 
     * @param {Task[]} tasks 
     */
    constructor(name, tasks){
        this.name = name;
        let Scheduler = require('./scheduler');
        if (tasks!=undefined&&tasks!=[]) {
            tasks.forEach(task => {
                this.task_group.set(task.name, task);
                Scheduler.addTask(task);
            });
        }
    }

    /**
     * Stop all tasks of this plan
     */
    stop() {
        console.log(`[Scheduler][Plan:${this.name}]Plan is going to stop...`);
        let Scheduler = require('./scheduler');
        this.task_group.forEach(task => {
            Scheduler.stopTask(task.name);
        });
        console.log(`[Scheduler][Plan:${this.name}]Plan has stopped successfully`);
    }

    /**
     * Start all tasks of this plan
     */
    start() {
        console.log(`[Scheduler][Plan:${this.name}]Plan is going to start...`);
        let Scheduler = require('./scheduler');
        this.task_group.forEach(task => {
            Scheduler.startTask(task.name);
        });
        console.log(`[Scheduler][Plan:${this.name}]Plan has started successfully`);
    }

    /**
     * Add a task into this plan
     * @param {Task} task 
     */
    addTask(task){
        let Scheduler = require('./scheduler');
        this.task_group.set(task.name, task);
        Scheduler.addTask(task);
    }

    /**
     * Remove and stop a task from this plan
     * @param {Task|string} task 
     */
    removeTask(task){
        let Scheduler = require('./scheduler');
        this.task_group.delete(typeof(task)=='string'?task:task.name, task);
        Scheduler.removeTask(task);
    }

    /**
     * Add a series of tasks into this plan
     * @param {Task[]} tasks
     */
    addTasks(tasks){
        if (tasks!=undefined&&tasks!=[]) {
            tasks.forEach(task => {
                this.addTask(task);
            });
        }
    }

    /**
     * Remove and stop a series of tasks from this plan
     * @param {Task[]|string[]} tasks
     */
    removeTasks(tasks){
        if (tasks!=undefined&&tasks!=[]) {
            tasks.forEach(task => {
                this.removeTask(task);
            });
        }
        
    }

    /**
     * Start one task of this plan
     * @param {string|Task} task 
     */
    startTask(task) {
        console.log(`[Scheduler][Plan:${this.name}]Plan is going to start [Job:${task.name}]...`);
        this.Scheduler.startTask(task);
    }

    /**
     * Start some tasks of this plan
     * @param {string[]|Task[]} tasks 
     */
    startTasks(tasks) {
        this.Scheduler.startTasks(tasks);
    }

    /**
     * Stop one task of this plan
     * @param string|Task task 
     */
    stopTask(task) {
        console.log(`[Scheduler][Plan:${this.name}]Plan is going to stop [Job:${task.name}]...`);
        this.Scheduler.stopTask(task);
    }

    /**
     * Stop some tasks of this plan
     * @param string[]|Task[] tasks 
     */
    stopTasks(tasks) {
        this.Scheduler.stopTasks(tasks);
    }

    /**
     * Restart all tasks of this plan
     */
    restart() {
        console.log(`[Scheduler][Plan:${this.name}]Plan is going to restart...`);
        this.task_group.forEach(task => {
            this.Scheduler.restartTask(task.name);
        });
        console.log(`[Scheduler][Plan:${this.name}]Plan has restarted successfully`);
    }

    /**
     * Restart one of task of this plan
     * @param {string | Task} task 
     */
    restartTask(task) {
        console.log(`[Scheduler][Plan:${this.name}]Plan is going to restart [Job:${task.name}]...`);
        this.Scheduler.restartTask(task);
    }

    /**
     * Restart some tasks of this plan
     * @param {string[] | Task[]} tasks 
     */
    restartTasks(tasks) {
        this.Scheduler.restartTasks(tasks);
    }

    /**
     * Reschedule one task of this plan
     * @param {{task:string,rule:string|schedule.RecurrenceRule|Date|{}}|Task} task
     * @param {string|schedule.RecurrenceRule|Date|{}} rule
     */
    rescheduleTask(task, rule) {
        this.Scheduler.rescheduleTask(task, rule);
    }
}

module.exports = Plan