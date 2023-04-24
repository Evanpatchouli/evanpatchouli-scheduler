
const Task = require('./task');

class TaskHelper extends Task{
    /**
     * Constructor with param: task: Task
     * @param {Task} task 
     * @returns {Task}
     */
    constructor(task, options){
        super(`${task.name}-helper`,"0 */15 * * * *",()=>{
            let Scheduler = require('./scheduler');
            Scheduler.task_pool.get(task.name).releaseCache();
            Scheduler.task_pool.get(`${task.name}-helper`).releaseCache();
            return "Cache has been released"; //将被监听success的回调函数捕捉
        },options!=undefined?options:{logOn:task.logOn, cacheOn: task.cacheOn});
    }
}

module.exports = TaskHelper;