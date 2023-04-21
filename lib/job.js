const schedule = require('node-schedule');

class Job {

    /**
     * Constructor with params: name, rule and todo function
     * @param {string} name 
     * @param {string|schedule.RecurrenceRule|Date|{}} rule 
     * @param {Function} todo 
     */
    constructor(name,rule,todo){
        /**
         * @type {string}
         */
        this.name = name;
        /**
         * @type {string|schedule.RecurrenceRule|Date|{}}
         */
        this.rule = rule;
        /**
         * @type {Function}
         */
        this._todo = todo;
        /**
         * @type {schedule.Job}
         */
        this.job = new schedule.Job();
        /**
         * true means this job is on schedule
         * @type {boolean}
         */
        this.alive = false;
        /**
         * @type {{name:string,time:string}[]}
         */
        this.count = [];
        /**
         * @type {{name:string,time:string,result:any}[]}
         */
        this.success = [];
        /**
         * @type {{name:string,time:string,errMsg:string}[]}
         */
        this.fail = [];

        //1.先执行 scheduled 回调
        this.job.on("scheduled",()=>{
            this.alive = true;
            console.log(`[Scheduler][Job:${this.name}]Job is scheduled as ${JSON.stringify(this.rule)}`);
            //scheduled的回调函数中出的错不会被监听error所捕获
        });
        //3.再执行 run 回调
        this.job.on("run",()=>{
            console.log(`[Job:${this.name}]Joib has finished`);
        });
        //4.再执行 success 回调
        this.job.on("success",(data)=>{
            console.log(`[Scheduler][Job:${this.name}]Result: ${data}`);
            this.success.push({name: this.job.name, time: new Date().toLocaleString(), result: data});
            console.log(`[Scheduler][Job:${this.name}]Done successfully`);
            console.log(this.toString(),"\n");  
        });
        //5.只监听任务创建回调,run回调和success回调中产生的异常
        this.job.on("error",(err)=>{
            this.fail.push({name: this.job.name, time: new Date().toLocaleString(), errMsg: err.message });
            console.log(`[ERROR][Job:${this.name}][${new Date().toLocaleString()}]${err.message}`);
            console.log(this.toString(),"\n");
        });
        //6.计划被取消的那一刻执行 canceled
        this.job.on("canceled",()=>{
            this.alive = false;
            console.log(`[Scheduler][Job:${this.name}]Schedule has been canceld`);
        });
    }

    /**
     * Start this job schedule
     */
    start(){
        console.log(`[Scheduler][Job:${this.name}]Schedule starts`);
        this.job = schedule.scheduleJob(this.name,this.rule,
        //2.在执行这里的回调
        async ()=>{
            this.count.push({name: this.job.name, time: new Date().toLocaleString()});
            console.log(`[Scheduler][Job:${this.name}]Job is going...`);
            const result = await this._todo();
            return result; //将被监听success的回调函数捕捉
        });
    }

    /**
     * Reschedule this job schedule
     * @param {string|schedule.RecurrenceRule|Date|{}} rule 
     */
    reschedule(rule){
        this.job.reschedule(rule);
    }

    /**
     * Restart this job schedule
     * @param {string|schedule.RecurrenceRule|Date|{}} rule 
     */
    restart(){
        this.job.reschedule(this.rule);
    }

    /**
     * Stop this job schedule
     */
    stop(){
        this.job.cancel();
    }

    releaseCache(){
        this.count = [];
        this.success = [];
        this.fail = [];
    }
}

module.exports = Job;