const Plan = require('./plan');

/**
 * Start a plan
 * @param {Plan} plan 
 */
function addPlan(plan) {
    let Scheduler = require('./scheduler');
    Scheduler.plan_pool.set(plan.name, plan);
}

/**
 * Start a plan
 * @param {string|Plan} plan 
 */
function startPlan(plan) {
    switch (typeof plan) {
        case 'object':
            findPlan(plan.name).start();
            break;
        case 'string':
            findPlan(plan).start();
            break;
        default:
            break;
    }
}

/**
 * Stop a plan
 * @param {string|Plan} plan 
 */
function stopPlan(plan) {
    switch (typeof plan) {
        case 'object':
            findPlan(plan.name).stop();
            break;
        case 'string':
            findPlan(plan).stop();
            break;
        default:
            break;
    }
}

/**
 * Stop and remove a plan
 * @param {string|Plan} plan 
 */
function removePlan(plan) {
    stopPlan(plan);
    let Scheduler = require('./scheduler');
    switch (typeof plan) {
        case 'object':
            Scheduler.plan_pool.delete(plan.name);
            break;
        case 'string':
            Scheduler.plan_pool.delete(plan.name);
            break;
        default:
            break;
    }
}

/**
 * Stop and remove all Plans
 */
function dumpPlans() {
    let Scheduler = require('./scheduler');
    Scheduler.plan_pool.forEach(plan => {
        removePlan(plan);
    })
}

/**
 * Find Plan in plan_pool by name
 * @param {string} name 
 * @returns
 */
function findPlan(name) {
    let Scheduler = require('./scheduler');
    let plan = Scheduler.plan_pool.get(name);
    return (plan != undefined) ? plan : null;
}

module.exports = {
    addPlan,
    startPlan,
    stopPlan,
    removePlan,
    dumpPlans,
    findPlan
};