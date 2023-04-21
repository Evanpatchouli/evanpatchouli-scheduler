const Job = require('./job');

class JobHelper extends Job{
    /**
     * Constructor with param: job: Job
     * @param {Job} job 
     * @returns {Job}
     */
    constructor(job){
        const job_helper = new Job(`${job.name}-helper`,"0 */15 * * * *",()=>{
            this.job_pool.get(job.name).releaseCache();
            this.job_pool.get(`${job.name}-helper`).releaseCache();
            return "Cache has been released"; //将被监听success的回调函数捕捉
        });
        return job_helper;
    }
}

module.exports = JobHelper;