const { Task } = require('../index');

const task1 = new Task("task1", "*/1 * * * * *", ()=>{
  console.log("Go!");
},{logOn:false, cacheOn:false});

module.exports = task1;