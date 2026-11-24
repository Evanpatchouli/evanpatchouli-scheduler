import {Job,RecurrenceRule} from 'node-schedule';
import { TaskOption } from './task.option';

class Task {
  get alive(): boolean {
    return this.job.nextInvocation() != null;
  }
  public cacheOn: boolean = false;
  public logOn: boolean = true;
  public job: Job;
  public success: {name:string,time:string,result:any}[] = [];
  public fail: {name:string,time:string,errMsg:string}[] = [];
  public count: {name:string,time:string}[] = [];
  /**
   * 
   * @param name - The name of the task
   * @param rule - the rule of the task schedule 
   * @param todo - the concrete things the task will do
   * @param options - set logOn and cacheOn
   */
  constructor(
    public name: string,
    public rule: string|RecurrenceRule|Date|number|{[x:string]:any},
    public todo: Function,
    public options: TaskOption ={logOn:true,cacheOn:false}
  ){
    this.job = new Job(async () => {
      if (this.cacheOn) {
        this.count.push({name: this.name, time: new Date().toLocaleString()});
      }
      if (this.logOn) console.log(`[Scheduler][Task:${this.name}]Task is going...`);
      return this.todo();
    });
    this.initEvent(this);
  }

  /**
   * Start this task schedule
   */
  start(){
    if (!this.alive && !this.job.schedule(this.rule as Date | string | number)) {
      this.job.cancel();
      throw new Error(`[Scheduler]Cannot schedule task "${this.name}"`);
    }
  }

  /**
   * Reschedule this task schedule
   * @param rule - the rule of the task schedule 
   */
  reschedule(rule: string|RecurrenceRule|Date|number|{[x:string]:any}){
    this.rule = rule;
    this.job.reschedule(rule as string | number | RecurrenceRule);
  }

  /**
   * Restart this task schedule
   */
  restart(){
    console.log(`[Scheduler][Task:${this.name}]Schedule restarts`);
    this.job.reschedule(this.rule as string | number | RecurrenceRule);
  }

  /**
   * Stop this task schedule
   */
  stop(){
    this.job.cancel();
  }

  /**
   * Release the cache
   */
  releaseCache(){
    this.count = [];
    this.success = [];
    this.fail = [];
  }

  /**
   * Output the task to string text
   * @returns 
   */
  toString(){
    return `Task{name:${JSON.stringify(this.name)}, rule:${JSON.stringify(this.rule)}, alive:${this.alive}, count:${this.count.length}, success:${this.success.length}, fail:${this.fail.length}}}`;
  }

  private initEvent(task: Task){
    //1.先执行 scheduled 回调
    task.job.on("scheduled",()=>{
        if (task.logOn){
            console.log(`[Scheduler][Task:${task.name}]Task is scheduled as ${JSON.stringify(task.rule)}`);
        }
        //scheduled的回调函数中出的错不会被监听error所捕获
    });
    //3.再执行 run 回调
    task.job.on("run",()=>{
        if (task.logOn){
            console.log(`[Scheduler][Task:${task.name}]Task has finished`);
        }
    });
    //4.再执行 success 回调
    task.job.on("success",(data)=>{
        if (task.cacheOn){
            task.success.push({name: task.name, time: new Date().toLocaleString(), result: data});
        }
        
        if (task.logOn){
            console.log(`[Scheduler][Task:${task.name}]Result: ${data}`);
            console.log(`[Scheduler][Task:${task.name}]Done successfully`);
            console.log(`[Scheduler][Task:${task.name}]${task.toString()}`,"\n");  
        }
        
    });
    //5.只监听任务创建回调,run回调和success回调中产生的异常
    task.job.on("error",(err)=>{
        if (task.cacheOn){
            task.fail.push({name: task.name, time: new Date().toLocaleString(), errMsg: err.message });
        }
        console.log(`[ERROR][Task:${task.name}][${new Date().toLocaleString()}]${err.message}`);
        console.log(`[Scheduler][Task:${task.name}]${task.toString()}`,"\n");
    });
    //6.计划被取消的那一刻执行 canceled
    task.job.on("canceled",()=>{
        console.log(`[Scheduler][Task:${task.name}]Schedule has been canceld`);
    });
  }
}

export default Task;
