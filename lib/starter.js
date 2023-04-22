const Scheduler = require('./scheduler');
const evchart = require('js-text-chart').evchart;

function run(){
    const isLogo = checkArgs(arguments);
    if(isLogo) {
        let str = "scheduler";
        let mode = [ "close", "far", undefined ];
        let chart = evchart.convert(str, mode[0]);
        console.log(chart);
    }

    let scheduler = Scheduler.getInstance();
    scheduler.startAll();
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