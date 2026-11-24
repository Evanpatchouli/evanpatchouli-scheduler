import Plan from './plan';
import Scheduler from './scheduler';

export function addPlan(plan: Plan) {
  const existing = Scheduler.plan_pool.get(plan.name);
  if (existing === plan) return;
  if (!plan.name.trim() || existing) throw new Error(`[Scheduler]Invalid or duplicate plan "${plan.name}"`);
  Scheduler.addTasks([...plan.task_group.values()].filter(task => !Scheduler.getTask(task)));
  Scheduler.plan_pool.set(plan.name, plan);
}

export function findPlan(ref: string | Plan) {
  const plan = Scheduler.plan_pool.get(typeof ref === 'string' ? ref : ref.name);
  return typeof ref === 'string' || ref === plan ? plan : undefined;
}

function requirePlan(ref: string | Plan) {
  const plan = findPlan(ref);
  if (!plan) throw new Error('[Scheduler]Unknown plan');
  return plan;
}

export function startPlan(ref: string | Plan) { requirePlan(ref).start(); }
export function stopPlan(ref: string | Plan) { requirePlan(ref).stop(); }

export function removePlan(ref: string | Plan) {
  const plan = requirePlan(ref);
  plan.stop();
  Scheduler.plan_pool.delete(plan.name);
}

export function dumpPlans() {
  for (const plan of Scheduler.plan_pool.values()) removePlan(plan);
}

export default { addPlan, findPlan, startPlan, stopPlan, removePlan, dumpPlans };
