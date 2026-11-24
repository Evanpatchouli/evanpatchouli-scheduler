import Task from "./task";
import { TaskOption } from "./task.option";

class TaskHelper extends Task{
  /**
   * Constructor with param: task: Task
   * @param {Task} task 
   * @param {TaskOption} options
   */
  constructor(task: Task, options?: TaskOption) {
    super(`${task.name}-helper`,"0 */15 * * * *",()=>{
      task.releaseCache();
      this.releaseCache();
      return "Cache has been released"; //将被监听success的回调函数捕捉
    },options??{logOn:task.logOn, cacheOn: task.cacheOn});
  }
}

export default TaskHelper;
