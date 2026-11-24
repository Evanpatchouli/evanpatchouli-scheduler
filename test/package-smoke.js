const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createRequire } = require('node:module');

const root = path.resolve(__dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'scheduler-pack-'));
const source = path.join(temp, 'source');
const consumer = path.join(temp, 'consumer');

function npm(cwd, ...args) {
  execFileSync(process.execPath, [process.env.npm_execpath, ...args], { cwd, stdio: 'inherit' });
}

try {
  fs.mkdirSync(source);
  fs.mkdirSync(consumer);
  for (const entry of ['lib', 'index.js', 'package.json', 'package-lock.json', 'tsconfig.json', 'LICENSE', 'README.md']) {
    fs.cpSync(path.join(root, entry), path.join(source, entry), { recursive: true });
  }
  npm(source, 'ci', '--prefix', source, '--ignore-scripts', '--no-audit', '--no-fund');
  assert.equal(fs.existsSync(path.join(source, 'dist')), false);
  npm(source, 'pack', '--pack-destination', temp, '--silent');
  const archives = fs.readdirSync(temp).filter(name => name.endsWith('.tgz'));
  assert.equal(archives.length, 1);

  fs.writeFileSync(path.join(consumer, 'package.json'), JSON.stringify({ name: 'scheduler-smoke', private: true }));
  npm(consumer, 'install', '--prefix', consumer, '--ignore-scripts', '--no-audit', '--no-fund', path.join(temp, archives[0]));
  const fromConsumer = createRequire(path.join(consumer, 'index.js'));
  const packageRoot = path.join(consumer, 'node_modules', '@evanpatchouli', 'scheduler');
  assert.equal(fromConsumer.resolve('@evanpatchouli/scheduler'), path.join(packageRoot, 'dist', 'index.js'));
  const { Task, Scheduler, RedisScheduler } = fromConsumer('@evanpatchouli/scheduler');
  assert.equal(typeof RedisScheduler.open, 'function');
  assert.equal(fs.existsSync(path.join(consumer, 'node_modules', 'redis')), false);
  const task = new Task('smoke', '* * * * * *', () => {});
  Scheduler.addTask(task);
  assert.equal(Scheduler.getTask('smoke'), task);
  Scheduler.removeTask(task);

  fs.copyFileSync(path.join(__dirname, 'consumer', 'types.ts'), path.join(consumer, 'types.ts'));
  fs.writeFileSync(path.join(consumer, 'tsconfig.json'), JSON.stringify({
    compilerOptions: { module: 'commonjs', target: 'es2021', strict: true, noEmit: true, types: [] },
    files: ['types.ts']
  }));
  execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '-p', consumer], { cwd: consumer, stdio: 'inherit' });
  console.log('Tarball passed CommonJS and strict TypeScript consumer checks.');
} finally {
  // temp is the unique directory returned by mkdtempSync above.
  fs.rmSync(temp, { recursive: true, force: true });
}
