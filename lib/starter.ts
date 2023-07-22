import * as jstexchart from "js-text-chart";
import Scheduler from "./scheduler";

/**
 * !Warnning: if you start task or plan in todo, 
 * must avoid to do actions of start/stop... by Scheduler/PlanTool/ScheTool at once, 
 * because js is single thread, if you have to do, please use setTimeout 
 * to create enough time delay between Starter and your outer star/stop/dump action code.
 * @param {boolean} isLogo
 * @param {Function} todo
 * @param {{}} params
 */
function run(isLogo: boolean, todo?: Function, params?: {}) {
  isLogo = checkArgs(arguments);
  if (isLogo) {
    let str = "scheduler";
    let chart = jstexchart.convert(str, "close");
    console.log(chart);
  }

  // Whether to use yourself definded actions
  if (!todo) {
    Scheduler.startAll();
  } else {
    todo(params);
  }
}

function checkArgs(args: IArguments) {
  if (args.length != 0) {
    let allow = [true, 1, "1", "true"];
    let isLogo = false;
    if (args[0]) {
      if (allow.includes(args[0])) {
        isLogo = true;
      }
      if (typeof args[0] == 'string' && allow.includes(args[0].toLowerCase())) {
        isLogo = true;
      }
    }
    return isLogo;
  }
  return false;
}

export default {
  run
}