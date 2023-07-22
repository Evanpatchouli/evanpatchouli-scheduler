const { Task } = require('../index');

const task2 = new Task("task2", "*/1 * * * * *", ()=>{
  console.log("Back!");
},{logOn:false, cacheOn:false});

module.exports = task2;