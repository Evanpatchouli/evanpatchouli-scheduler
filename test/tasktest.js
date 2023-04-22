const { Task } = require('../index');

const tasktest = new Task("tasktest", "*/1 * * * * *", ()=>{
    console.log("Go!");
});

module.exports = tasktest;