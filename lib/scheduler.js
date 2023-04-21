const e = require('express');
const schedule = require('node-schedule');
const Job = require('./job');
const JobHelper = require('./jobHelper');

/**
 * @instance This is a single instance object
 * @typeof {Scheduler}
 */
let Scheduler = function(){
    this.instance = null;
    /**
     * @type {Map<string,Job>}
     */
    this.job_pool = new Map();
}

/**
 * Get instance
 * @returns {Scheduler}
 */
Scheduler.getInstance = function() {
    if (this.instance) {
        return this.instance;
    } else {
        this.instance = new Scheduler()
    }
    return this.instance;
}

/**
 * Start all jobs
 */
Scheduler.prototype.startAll = function(){
    console.log("[Scheduler]Going to start all jobs...");
    for (const job of this.job_pool.values()) {
        if (!job.name.endsWith("-helper")){
            job.start();
        }
    }
    console.log("[Scheduler]All jobs have been started");
}

/**
 * Start a job as well its helper
 * @param {string|Job} job 
 */
 Scheduler.prototype.startJob = function(job){
    switch (typeof(job)) {
        case 'object':
            this.job_pool.get(job.name).start();
            this.job_pool.get(`${job.name}-helper`).start();
            break;
        case 'string':
            this.job_pool.get(job).start();
            this.job_pool.get(`${job}-helper`).start();
            break;
        default:
            break;
    }
}

/**
 * Start a job as well its helper
 * @param {Array<string|Job>} jobs 
 */
 Scheduler.prototype.startJobs = function(jobs){
    for (const job of object) {
        this.startJob(job);
    }
}

/**
 * Print name of all jobs
 */
Scheduler.prototype.printAll = function(){
    console.log("[Scheduler]Going to print name of all jobs...");
    let i = 0;
    for (const job of this.job_pool.values()) {
        console.log(`[Scheduler]Job:${++i}:${job.name}`);
    }
}

/**
 * Stop all jobs
 */
Scheduler.prototype.stopAll = function(){
    console.log("[Scheduler]Going to shutdown all jobs...");
    schedule.gracefulShutdown();
    console.log("[Scheduler]All jobs have been shutdown gracefully");
}

/**
 * Add a job and you can deside whether to start it right now
 * @param {Job} job
 * @param {boolean} isToStart
 */
Scheduler.prototype.addJob = function(job, isToStart){
    this.job_pool.set(job.name, job);
    this.registerHelper(job);
    if (arguments.length == 2 && isToStart == true) {
        this.job_pool.get(job.name).start();
        this.job_pool.get(`${job.name}-helper`).start();
    }
}

Scheduler.prototype.registerHelper = function(job){
    const job_helper = new JobHelper(job);
    this.job_pool.set(`${job.name}-helper`,job_helper);
}

/**
 * Add a series of jobs and you can deside whether to start them right now
 * @param {Array<Job>} jobs
 * @param {boolean} isToStart
 */
Scheduler.prototype.addJobs = function(jobs, isToStart){
    for (const job of jobs) {
        this.addJob(job, arguments.length >= 2? isToStart:false);
    }
}

/**
 * Stop one certain job
 * @param {string|Job} job 
 */
Scheduler.prototype.stopJob = function(job){
    switch (typeof(job)) {
        case 'object':
            this.job_pool.get(job.name).stop();
            this.job_pool.get(`${job.name}-helper`).stop();
            break;
        case 'string':
            this.job_pool.get(job).stop();
            this.job_pool.get(`${job}-helper`).stop();
            break;
        default:
            break;
    }
}

/**
 * Stop a series of certain jobs
 * @param {Array<string>|Array<Job>} jobs
 */
 Scheduler.prototype.stopJobs = function(jobs){
    for (const job of jobs) {
        this.stopJob(job);
    }
}

/**
 * Remove one certain job
 * @param {string|Job} job 
 */
Scheduler.prototype.removeJob = function(job){
    switch (typeof(job)) {
        case 'object':
            if (this.job_pool.get(job.name).alive) {
                this.stopJob(job);
            }
            this.job_pool.delete(job.name);
            this.job_pool.delete(`${job.name}-helper`);
            break;
        case 'string':
            if (this.job_pool.get(job).alive) {
                this.stopJob(job);
            }
            this.job_pool.delete(job);
            this.job_pool.delete(`${job}-helper`);
            break;
        default:
            break;
    }
}

/**
 * Remove a series of certain jobs
 * @param {Array<string>|Array<Job>} jobs
 */
Scheduler.prototype.removeJobs = function(jobs){
    for (const job of jobs) {
        this.removeJob(job);
    }
}

/**
 * Restart a job
 * @param {Job|string} job
 */
Scheduler.prototype.restartJob = function(job){
    this.job_pool.get(typeof(job)=='string'?job:job.name).restart();
}

/**
 * Restart a series of jobs
 * @param {Array<string>|Array<Job>} jobs
 */
 Scheduler.prototype.restartJobs = function(jobs){
    for (const job of jobs) {
        this.restartJob(job);
    }
}

/**
 * Reschedule one certain job
 * @param {{job:string,rule:string|schedule.RecurrenceRule|Date|{}}|Job} job 
 * @param {string|schedule.RecurrenceRule|Date|{}} rule
 */
Scheduler.prototype.rescheduleJob = function(job,rule){
    if (arguments.length == 1) {
        if (arguments[0] instanceof Job) {
            this.job_pool.get(job.name).reschedule(job.rule);
            this.restartJob(`${job.name}-helper`);
        }
        if (arguments[0] instanceof {job}) {
            this.job_pool.get(arguments[0].job.name).reschedule(arguments[0].job.rule);
            this.restartJob(`${arguments[0].job.name}-helper`); 
        }
        if (arguments[0] instanceof {job,rule}) {
            switch (typeof arguments[0].job) {
                case 'object':
                    if (arguments[0].rule != undefined || arguments[0].rule != null) {
                        this.job_pool.get(arguments[0].job.name).reschedule(arguments[0].rule);
                    } else {
                        this.job_pool.get(arguments[0].job.name).reschedule(arguments[0].job.rule);
                    }
                    this.restartJob(`${arguments[0].job.name}-helper`);
                    break;
                case 'string':
                    this.job_pool.get(arguments[0].job).reschedule(arguments[0].rule);
                    this.restartJob(`${arguments[0].job}-helper`);
                    break;
                default:
                    break;
            }  
        }  
    }
    if (arguments.length == 2) {
        switch (typeof job) {
            case 'object':
                this.job_pool.get(job.name).reschedule((rule!=null||rule!=undefined)?rule:job.rule);
                this.job_pool.get(`${job.name}-helper`).restart();
                break;
            case 'string':
                this.job_pool.get(job).reschedule(rule);
                this.job_pool.get(`${job}-helper`).restart();
                break;
            default:
                break;
        }
    }
}

module.exports = Scheduler;
