const { Scheduler, Starter } = require('../index');
const tasktest = require('./tasktest');

async function init(){
    let scheduler = Scheduler.getInstance();
    scheduler.addTask(tasktest);
    Starter.run(true);
    scheduler.printAll();
    setTimeout(()=>{scheduler.rescheduleTask("tasktest", "*/5 * * * * *");},5000);
    setTimeout(scheduler.stopAll,20000);
}

module.exports = init;