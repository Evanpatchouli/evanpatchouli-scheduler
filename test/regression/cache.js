const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { Task, Scheduler, TaskHelper } = require('../..');

test('dirty tasks share one unrefed cleanup and histories retain their newest entries', (t) => {
  const timeouts = [];
  const schedule = global.setTimeout;
  t.mock.method(global, 'setTimeout', (callback, delay) => {
    const timer = schedule(callback, delay);
    timeouts.push({ callback, timer });
    return timer;
  });
  const a = new Task('cache-a', '* * * * * *', () => {}, { logOn: false, historyLimit: 2 });
  a.cacheOn = true;
  const b = new Task('cache-b', '* * * * * *', () => {}, { logOn: false, cacheOn: true });
  for (let i = 0; i < 5; i++) a.job.emit('success', i);
  b.job.emit('error', 'error');
  assert.deepEqual(a.success.map(row => row.result), [3, 4]);
  assert.equal(timeouts.length, 1);
  assert.equal(timeouts[0].timer.hasRef(), false);
  clearTimeout(timeouts[0].timer);
  timeouts[0].callback();
  assert.deepEqual(a.success, []);
  assert.deepEqual(b.fail, []);
  assert.throws(() => new Task('bad', '', () => {}, { historyLimit: -1 }), RangeError);
  const zero = new Task('zero', '* * * * * *', () => {}, { cacheOn: true, logOn: false, historyLimit: 0 });
  zero.job.emit('success', 1);
  assert.equal(zero.success.length, 0);
  assert.equal(timeouts.length, 1);
});

test('one-shot scripts exit naturally with or without cached results', () => {
  const script = `
    const { Task, Scheduler } = require('.');
    let completed = 0;
    for (const cacheOn of [false, true]) {
      Scheduler.addTask(new Task(String(cacheOn), new Date(Date.now() + 150), () => ++completed, { cacheOn, logOn: false }), true);
    }
    process.on('beforeExit', () => { console.log(completed, Scheduler.task_pool.size); });
  `;
  const result = spawnSync(process.execPath, ['-e', script], { encoding: 'utf8', timeout: 6000 });
  assert.equal(result.status, 0, String(result.error || result.stderr));
  assert.equal(result.stdout.trim(), '2 2');
});

test('explicit helpers still target the supplied task instance', async () => {
  const task = new Task('manual', '* * * * * *', () => {}, { cacheOn: true, logOn: false });
  Scheduler.addTask(task);
  assert.equal(Scheduler.getTask('manual-helper'), undefined);
  Scheduler.registerHelper(task);
  const helper = Scheduler.getTask('manual-helper');
  assert.ok(helper instanceof TaskHelper);
  task.job.emit('success', 42);
  await helper.todo();
  assert.equal(task.success.length, 0);
});
