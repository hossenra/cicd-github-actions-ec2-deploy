// Dependency-free classroom lint: syntax and basic unused-variable checks.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const files = ['src/app.js', 'src/server.js', 'test/app.test.js'];
let failed = false;
for (const file of files) {
  const full = path.join(__dirname, '..', file);
  try {
    execFileSync(process.execPath, ['--check', full], { stdio: 'pipe' });
  } catch (error) {
    console.error(`Syntax error in ${file}: ${error.stderr.toString()}`);
    failed = true;
  }
  const content = fs.readFileSync(full, 'utf8');
  if (/\b(?:const|let)\s+unused\b/.test(content)) {
    console.error(`Lint error in ${file}: unused variable named unused`);
    failed = true;
  }
}
if (failed) process.exitCode = 1;
else console.log('Lint passed: syntax valid and no demo unused variables.');
