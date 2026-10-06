const { spawnSync } = require('node:child_process');
const { readdirSync, rmSync } = require('node:fs');
const { resolve } = require('node:path');

const root = resolve(__dirname, '..');
const output = resolve(root, '.test-build');
rmSync(output, { recursive: true, force: true });
const compile = spawnSync(process.execPath, [require.resolve('typescript/bin/tsc'), '-p', 'tsconfig.test.json'], { cwd: root, stdio: 'inherit' });
if (compile.status !== 0) process.exit(compile.status || 1);
const tests = readdirSync(resolve(output, 'tests')).filter(name => name.endsWith('.test.js')).map(name => resolve(output, 'tests', name));
const result = spawnSync(process.execPath, ['--test', ...tests], { cwd: root, stdio: 'inherit' });
process.exit(result.status ?? 1);
