const { Scheduler, Starter, Plan, PlanTool } = require('../index');
const task1 = require('./task1');
const task2 = require('./test2');

async function init(){
    let plan = new Plan("plan1",[task1,task2]);
    PlanTool.addPlan(plan);
    
    setTimeout(()=>{
        Scheduler.printAll();

        let params = {
            plan,task1,task2
        }
        Starter.run(true, todo, params);
    },0);
}

function todo(params) {
    setTimeout(()=>{PlanTool.startPlan(params.plan);},5000);
    // setTimeout(()=>{
    //     Scheduler.rescheduleTask(params.task1.name, "*/5 * * * * *");
    //     Scheduler.rescheduleTask(params.task2.name, "*/5 * * * * *");
    // },15000);
    setTimeout(()=>{Scheduler.stopAll();},20000);
}

module.exports = init;