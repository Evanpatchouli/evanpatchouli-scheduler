import api, { Task, Plan, PlanTool, Scheduler, Starter, TaskOption, RecurrenceRule } from '@evanpatchouli/scheduler';
import { RedisScheduler, SchedulerRedisClient, StoredRedisTask } from '@evanpatchouli/scheduler';

const options: TaskOption = { cacheOn: true };
const task: Task = new Task('a', new RecurrenceRule(), () => 42, options);
const plan: Plan = new Plan('p');
plan.addTask(task);
PlanTool.addPlan(plan);
plan.startTasks([task, 'a']);
plan.rescheduleTask({ task, rule: new Date() });
api.Scheduler.rescheduleTask(task);
Scheduler.getInstance().start(task);
Starter.run();
const ready: Promise<number> = Starter.run(false, async ({ count }) => count, { count: 2 });
const stopped: Promise<void> = Scheduler.stopAll();
void Promise.all([ready, stopped]);

async function durable(client: SchedulerRedisClient) {
  const db = await RedisScheduler.open({ client, namespace: 'example', handlers: { report: async () => 42 } });
  await db.addTask({ name: 'weekly', handler: 'report', rule: '0 9 * * 1', options }, true);
  const saved: StoredRedisTask | undefined = db.getTask('weekly');
  await db.close();
  return saved;
}
