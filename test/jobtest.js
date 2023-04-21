const { Job } = require('../index');

const jobtest = new Job("jobtest", "*/1 * * * * *", ()=>{
    console.log("Go!");
});

module.exports = jobtest;