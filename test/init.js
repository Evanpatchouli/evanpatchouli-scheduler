const { Job, Scheduler, Starter } = require('../index');

async function init(){
    let scheduler = Scheduler.getInstance();
    const jobtest = new Job("jobtest","* * * * * *",()=>{console.log("Go!")});
    scheduler.addJob(jobtest);
    Starter.run(true);
    scheduler.printAll();
    setTimeout(()=>{scheduler.rescheduleJob("jobtest", "*/5 * * * * *");},5000);
    setTimeout(scheduler.stopAll,60000);
}

module.exports = init;