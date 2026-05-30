const { spawnSync } = require('node:child_process');
const path = require('node:path');

const tests = [
  'formatter-core.test.js',
  'formatter-rendering.test.js',
  'formatter-regression.test.js'
];

for (const test of tests) {
  const result = spawnSync(process.execPath, [path.join(__dirname, test)], { stdio: 'inherit' });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

console.log('all formatter tests passed');
