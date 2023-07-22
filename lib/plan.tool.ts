import Plan from "./plan";
import Scheduler from "./scheduler";

/**
 * Start a plan
 * @param {Plan} plan 
 */
export function addPlan(plan: Plan) {
  Scheduler.plan_pool.set(plan.name, plan);
}

/**
* Start a plan
* @param {string|Plan} plan 
*/
export function startPlan(plan: string | Plan) {
  let planRef = findPlan(plan);
  if (!planRef) {
    throw new Error("[Scheduler]Plan to start does not exist");
  }
  planRef.start();
}

/**
* Stop a plan
* @param {string|Plan} plan 
*/
export function stopPlan(plan: string | Plan) {
  let planRef = findPlan(plan);
  if (!planRef) {
    throw new Error("[Scheduler]Plan to stop does not exist");
  }
  planRef.stop();
}

/**
* Stop and remove a plan
* @param {string|Plan} plan 
*/
export function removePlan(plan: string | Plan) {
  stopPlan(plan);
  switch (typeof plan) {
    case 'object':
      Scheduler.plan_pool.delete(plan.name);
      break;
    case 'string':
      Scheduler.plan_pool.delete(plan);
      break;
    default:
      break;
  }
}

/**
* Stop and remove all Plans
*/
export function dumpPlans() {
  Scheduler.plan_pool.forEach(plan => {
    removePlan(plan);
  })
}

/**
* Find Plan in plan_pool by name
*/
export function findPlan(plan: string | Plan): Plan|undefined {
  let planRef: Plan|undefined = undefined;
  switch (typeof plan) {
    case 'object':
      planRef = Scheduler.plan_pool.get(plan.name)
      break;
    case 'string':
      planRef =  Scheduler.plan_pool.get(plan);
      break;
    default: break;
  }
  return planRef;
}

export default {
  addPlan,
  startPlan,
  stopPlan,
  removePlan,
  dumpPlans,
  findPlan
}