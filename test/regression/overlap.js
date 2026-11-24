const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Task, Scheduler } = require('../..');

for (const overlap of [undefined, 'skip']) {
  test(`overlap policy ${overlap || 'default'} survives a change of schedule`, { timeout: 4000 }, async () => {
    let calls = 0, entered, release, enteredAgain;
    const first = new Promise(resolve => { entered = resolve; });
    const second = new Promise(resolve => { enteredAgain = resolve; });
    const gate = new Promise(resolve => { release = resolve; });
    const task = new Task('slow', new Date(Date.now() + 100), async () => {
      if (++calls === 1) entered();
      else enteredAgain();
      await gate;
      return calls;
    }, { cacheOn: true, logOn: false, overlap });
    Scheduler.addTask(task, true);
    await first;
    Scheduler.rescheduleTask(task, new Date(Date.now() + 100));
    if (overlap === 'skip') {
      await new Promise(resolve => task.job.once('success', resolve));
      assert.equal(calls, 1);
      assert.equal(task.success.length, 0);
    } else {
      await second;
      assert.equal(task.runningCount, 2);
    }
    release();
    await Scheduler.stopAll();
    await new Promise(resolve => setImmediate(resolve));
    Scheduler.rescheduleTask(task, new Date(Date.now() + 100));
    await new Promise(resolve => task.job.once('success', resolve));
    assert.equal(calls, overlap === 'skip' ? 2 : 3);
    assert.equal(task.count.length, calls);
    assert.equal(task.success.length, calls);
  });
}
