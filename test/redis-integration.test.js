const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
const { setTimeout: wait } = require('node:timers/promises');
const { promisify } = require('node:util');

const url = process.env.SCHEDULER_TEST_REDIS_URL;
if (!url) {
  throw new Error('Set SCHEDULER_TEST_REDIS_URL to a disposable Redis instance, e.g. redis://127.0.0.1:6379, and run npm run test:redis.');
}
const { createClient } = require('redis');
const { RedisScheduler } = require('..');

async function fixture(t) {
  const client = createClient({ url, socket: { reconnectStrategy: false } });
  await client.connect();
  const id = randomUUID();
  const managers = new Set();
  t.after(async () => {
    try {
      if (!client.isOpen) await client.connect();
      for (const manager of managers) await manager.close();
      const keys = [];
      for await (const key of client.scanIterator({ MATCH: `*${id}*` })) keys.push(key);
      if (keys.length) await client.del(keys);
    } finally {
      if (client.isOpen) await client.quit();
    }
  });
  return {
    client,
    namespace: `scheduler-test-${id}-main`,
    async open(handlers = { run() {} }, suffix = 'main', options = {}) {
      const manager = await RedisScheduler.open({ client, ...options, namespace: `scheduler-test-${id}-${suffix}`, handlers });
      managers.add(manager);
      return manager;
    },
    async close(manager) {
      await manager.close();
      managers.delete(manager);
    }
  };
}

const definition = (name, rule = '0 0 0 1 1 *') => ({ name, rule, handler: 'run', options: { logOn: false } });

test('another Node process restores running and paused tasks, changed rules and removals', async t => {
  const db = await fixture(t);
  const first = await db.open();
  await first.addTask(definition('running'));
  await first.startTask('running');
  await first.addTask(definition('paused'), true);
  await first.stopTask('paused');
  await first.addTask(definition('deleted'), true);
  await first.removeTask('deleted');
  const changedRule = '0 0 0 1 6 *';
  await first.rescheduleTask('running', changedRule);
  await db.close(first);
  assert.equal(await db.client.ping(), 'PONG');

  const readback = `
    const { createClient } = require('redis');
    const { RedisScheduler } = require('.');
    async function read() {
      const client = createClient({ url: process.env.SCHEDULER_TEST_REDIS_URL });
      await client.connect();
      try {
        const db = await RedisScheduler.open({ client, namespace: process.argv[1], handlers: { run() {} } });
        const tasks = ['running', 'paused', 'deleted'].map(name => db.getTask(name));
        await db.close();
        process.stdout.write(JSON.stringify(tasks));
      } finally {
        await client.quit();
      }
    }
    read().catch(error => { console.error(error); process.exitCode = 1; });
  `;
  const { stdout } = await promisify(execFile)(process.execPath, ['-e', readback, db.namespace], {
    cwd: path.join(__dirname, '..'), timeout: 10000
  });
  const [running, paused, deleted] = JSON.parse(stdout);
  assert.equal(running.name, 'running');
  assert.equal(running.enabled, true);
  assert.equal(running.rule, changedRule);
  assert.equal(paused.enabled, false);
  assert.equal(deleted, null);
});

test('independent namespaces can register and restore the same task name', async t => {
  const db = await fixture(t);
  const a = await db.open(undefined, 'a');
  const b = await db.open(undefined, 'b');
  await a.addTask(definition('shared-name'), true);
  await b.addTask(definition('shared-name'));
  await a.removeTask('shared-name');
  await db.close(a);
  await db.close(b);
  const reopenedA = await db.open(undefined, 'a');
  const reopenedB = await db.open(undefined, 'b');
  assert.equal(reopenedA.getTask('shared-name'), undefined);
  assert.equal(reopenedB.getTask('shared-name').enabled, false);
});

test('missing handlers reject restoration without losing saved definitions', async t => {
  const db = await fixture(t);
  const first = await db.open();
  await first.addTask(definition('needs-handler'), true);
  await db.close(first);
  await assert.rejects(db.open({ different() {} }));
  const restored = await db.open();
  assert.equal(restored.getTask('needs-handler').enabled, true);
});

test('a future one-shot is restored and fires with the newly registered handler', { timeout: 12000 }, async t => {
  const db = await fixture(t);
  let oldCalls = 0;
  const before = await db.open({ run: () => { oldCalls++; } });
  await before.addTask(definition('once', new Date(Date.now() + 2000)), true);
  await db.close(before);
  let fired;
  const invoked = new Promise(resolve => { fired = resolve; });
  let calls = 0;
  const after = await db.open({ run: () => { calls++; fired(); } });
  await invoked;
  await db.close(after);
  assert.equal(oldCalls, 0);
  assert.equal(calls, 1);
  assert.equal(await db.client.ping(), 'PONG');
});

test('failed Redis writes do not register or run a new local task', { timeout: 10000 }, async t => {
  const db = await fixture(t);
  let calls = 0;
  const first = await db.open({ run: () => { calls++; } });
  await db.client.disconnect();
  await assert.rejects(first.addTask(definition('unsaved', new Date(Date.now() + 300)), true));
  await db.client.connect();
  assert.equal(first.getTask('unsaved'), undefined);
  await wait(500);
  assert.equal(calls, 0);
  await db.close(first);
  const restored = await db.open();
  assert.equal(restored.getTask('unsaved'), undefined);
});

test('a lost reply suspends local scheduling and reopen reads the actual committed state', async t => {
  const db = await fixture(t);
  let loseReply = true;
  const faults = [];
  const client = {
    async sendCommand(args) {
      const reply = await db.client.sendCommand(args);
      if (loseReply && args[0] === 'EVAL' && args[1].includes("'HSET'")) {
        loseReply = false;
        throw new Error('write reply lost');
      }
      return reply;
    }
  };
  const first = await db.open(undefined, 'main', { client, onError: err => faults.push(err) });
  await assert.rejects(first.addTask(definition('saved'), true), /reply lost/);
  await assert.rejects(first.startTask('saved'), /reply lost/);
  assert.equal(faults.length, 1);
  await db.close(first);
  const second = await db.open();
  assert.equal(second.getTask('saved').scheduled, true);
});

test('concurrent management calls preserve order, snapshots are detached and failed reschedules preserve the original callback', { timeout: 6000 }, async t => {
  const db = await fixture(t);
  let fired;
  const invoked = new Promise(resolve => { fired = resolve; });
  const manager = await db.open({ run: fired });
  await Promise.all([
    manager.addTask(definition('ordered')),
    manager.startTask('ordered'),
    manager.stopTask('ordered')
  ]);
  assert.equal(manager.getTask('ordered').enabled, false);
  const due = new Date(Date.now() + 500);
  await manager.rescheduleTask('ordered', due);
  const snapshot = manager.getTask('ordered');
  snapshot.rule.setTime(0);
  assert.equal(manager.getTask('ordered').rule.getTime(), due.getTime());
  await assert.rejects(manager.rescheduleTask('ordered', new Date(0)));
  await invoked;
  await db.close(manager);
  const reopened = await db.open();
  assert.equal(reopened.getTask('ordered').rule.getTime(), due.getTime());
});

test('a finite year list completes its final occurrence without blocking the process', { timeout: 8000 }, async t => {
  const db = await fixture(t);
  let fired;
  const invoked = new Promise(resolve => { fired = resolve; });
  const manager = await db.open({ run: fired });
  const due = new Date(Date.now() + 2500);
  const rule = {
    year: [due.getUTCFullYear()], month: due.getUTCMonth(), date: due.getUTCDate(),
    hour: due.getUTCHours(), minute: due.getUTCMinutes(), second: due.getUTCSeconds(), tz: 'UTC'
  };
  await manager.addTask(definition('finite', rule), true);
  await invoked;
  assert.equal(manager.getTask('finite').scheduled, false);
});

test('only one owner can open a namespace until close releases it', async t => {
  const db = await fixture(t);
  const first = await db.open();
  await first.addTask(definition('owned'), true);
  await assert.rejects(db.open(), /active scheduler/);
  await db.close(first);
  const successor = await db.open();
  assert.equal(successor.getTask('owned').scheduled, true);
});

test('a stale scheduler cannot run a due task or release the successor lease', { timeout: 15000 }, async t => {
  const db = await fixture(t);
  let holdRenewal, finishRenewal;
  const renewalStarted = new Promise(resolve => { holdRenewal = resolve; });
  const lateReply = new Promise(resolve => { finishRenewal = resolve; });
  const delayedClient = {
    sendCommand(args) {
      // Keep the old worker live while its renewal is stalled beyond the real Redis TTL.
      if (args[0] === 'EVAL' && args[1].includes('PEXPIRE')) {
        holdRenewal();
        return lateReply;
      }
      return db.client.sendCommand(args);
    }
  };
  let oldCalls = 0, lost;
  const ownerLost = new Promise(resolve => { lost = resolve; });
  const old = await db.open({ run: () => { oldCalls++; } }, 'main', {
    client: delayedClient, leaseMs: 1000, onError: lost
  });
  try {
    await old.addTask(definition('due', new Date(Date.now() + 3500)), true);
    await renewalStarted;
    await wait(1100);
    let calls = 0, fired;
    const invoked = new Promise(resolve => { fired = resolve; });
    const successor = await db.open({ run: () => { calls++; fired(); } });
    const [error] = await Promise.all([ownerLost, invoked]);
    assert.equal(error.name, 'RedisLeaseLostError');
    assert.equal(oldCalls, 0);
    assert.equal(calls, 1);
    await db.close(old);
    await assert.rejects(db.open(), /active scheduler/);
    assert.ok(successor.getTask('due'));
  } finally {
    finishRenewal(0);
  }
});

test('restoring an elapsed one-shot skips it while other enabled schedules resume', { timeout: 9000 }, async t => {
  const db = await fixture(t);
  const first = await db.open();
  await first.addTask(definition('recurring'), true);
  const due = Date.now() + 600;
  await first.addTask(definition('elapsed', new Date(due)), true);
  await db.close(first);
  await wait(Math.max(0, due + 50 - Date.now()));
  let calls = 0;
  const second = await db.open({ run: () => { calls++; } });
  assert.equal(second.getTask('elapsed').scheduled, false);
  assert.equal(second.getTask('recurring').scheduled, true);
  await wait(50);
  assert.equal(calls, 0);
});

test('close drains a removed task even after another task reuses its name', { timeout: 9000 }, async t => {
  const db = await fixture(t);
  let started, release;
  const entered = new Promise(resolve => { started = resolve; });
  const gate = new Promise(resolve => { release = resolve; });
  const first = await db.open({ run: () => { started(); return gate; } });
  let closed = false, closing;
  try {
    await first.addTask(definition('reused', new Date(Date.now() + 250)), true);
    await entered;
    await first.removeTask('reused');
    await first.addTask(definition('reused'));
    closing = db.close(first).then(() => { closed = true; });
    await wait(100);
    assert.equal(closed, false);
    await assert.rejects(db.open(), /active scheduler/);
  } finally {
    release();
  }
  await closing;
  const second = await db.open();
  assert.equal(second.getTask('reused').enabled, false);
});
