const schedule = require('node-schedule');

function initEvent(task){
    //1.先执行 scheduled 回调
    task.job.on("scheduled",()=>{
        task.alive = true;
        console.log(`[Scheduler][Task:${task.name}]Task is scheduled as ${JSON.stringify(task.rule)}`);
        //scheduled的回调函数中出的错不会被监听error所捕获
    });
    //3.再执行 run 回调
    task.job.on("run",()=>{
        console.log(`[Task:${task.name}]Task has finished`);
    });
    //4.再执行 success 回调
    task.job.on("success",(data)=>{
        console.log(`[Scheduler][Task:${task.name}]Result: ${data}`);
        task.success.push({name: task.job.name, time: new Date().toLocaleString(), result: data});
        console.log(`[Scheduler][Task:${task.name}]Done successfully`);
        console.log(`[Scheduler][Task:${task.name}]task.toString()`,"\n");  
    });
    //5.只监听任务创建回调,run回调和success回调中产生的异常
    task.job.on("error",(err)=>{
        task.fail.push({name: task.job.name, time: new Date().toLocaleString(), errMsg: err.message });
        console.log(`[ERROR][Task:${task.name}][${new Date().toLocaleString()}]${err.message}`);
        console.log(`[Scheduler][Task:${task.name}]task.toString()`,"\n");
    });
    //6.计划被取消的那一刻执行 canceled
    task.job.on("canceled",()=>{
        task.alive = false;
        console.log(`[Scheduler][Task:${task.name}]Schedule has been canceld`);
    });
}

class Task {

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
         * true means this task is on schedule
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

        initEvent(this);
    }

    /**
     * Start this task schedule
     */
    start(){
        console.log(`[Scheduler][Task:${this.name}]Schedule starts`);
        this.job = schedule.scheduleJob(this.name,this.rule,
        //2.在执行这里的回调
        async ()=>{
            this.count.push({name: this.job.name, time: new Date().toLocaleString()});
            console.log(`[Scheduler][Task:${this.name}]Task is going...`);
            const result = await this._todo();
            return result; //将被监听success的回调函数捕捉
        });
        initEvent(this);
    }

    /**
     * Reschedule this task schedule
     * @param {string|schedule.RecurrenceRule|Date|{}} rule 
     */
    reschedule(rule){
        this.job.reschedule(rule);
    }

    /**
     * Restart this task schedule
     * @param {string|schedule.RecurrenceRule|Date|{}} rule 
     */
    restart(){
        this.job.reschedule(this.rule);
    }

    /**
     * Stop this task schedule
     */
    stop(){
        this.job.cancel();
    }

    releaseCache(){
        this.count = [];
        this.success = [];
        this.fail = [];
    }

    toString(){
        return `Task{name:${JSON.stringify(this.name)}, rule:${JSON.stringify(this.rule)}, alive:${this.alive}, count:${this.count.length}, success:${this.success.length}, fail:${this.fail.length}}}`;
    }
}

module.exports = Task;