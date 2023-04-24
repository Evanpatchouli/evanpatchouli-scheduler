const evchart = require('js-text-chart').evchart;

/**
 * !Warnning: if you start task or plan in todo, 
 * must avoid to do actions of start/stop... by Scheduler/PlanTool/ScheTool at once, 
 * because js is single thread, if you have to do, please use setTimeout 
 * to create enough time delay between Starter and your outer star/stop/dump action code.
 * @param {*} isLogo
 * @param {Function} todo
 * @param {{}} params
 */
function run(isLogo, todo, params){
    isLogo = checkArgs(arguments);
    if(isLogo) {
        let str = "scheduler";
        let mode = [ "close", "far", undefined ];
        let chart = evchart.convert(str, mode[0]);
        console.log(chart);
    }

    // Whether to use yourself definded actions
    if (typeof arguments[1] != 'function') {
        let Scheduler = require('./scheduler');
        Scheduler.startAll();
    } else {
        todo(params);
    }
}

function checkArgs(args) {
    if(args.length!=0){
        let allow = [true, 1, "1", "true"];
        let isLogo = false;
        if(args[0]){
            if (allow.includes(args[0])) {
                isLogo = true;
            }
            if (typeof args[0] == 'string' && allow.includes(args[0].toLowerCase())) {
                isLogo = true;
            }
        }
        return isLogo;
    }
}

module.exports = {
    run
}