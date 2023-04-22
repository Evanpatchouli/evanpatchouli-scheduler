
const Task = require('./task');

class TaskHelper extends Task{
    /**
     * Constructor with param: task: Task
     * @param {Task} task 
     * @returns {Task}
     */
    constructor(task){
        const task_helper = new Task(`${task.name}-helper`,"* * * * * *",()=>{
            const Scheduler = require('./scheduler');
            let scheduler = Scheduler.getInstance();
            scheduler.task_pool.get(task.name).releaseCache();
            scheduler.task_pool.get(`${task.name}-helper`).releaseCache();
            return "Cache has been released"; //将被监听success的回调函数捕捉
        });
        return task_helper;
    }
}

module.exports = TaskHelper;