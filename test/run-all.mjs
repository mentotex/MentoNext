// Runs every *.test.mjs file in this directory as a separate Node process
// (each test file mutates global.fetch freely, so isolation between files
// matters) and fails the overall run if any of them exits non-zero.
//
// These are plain runtime tests against the built dist/ output — real
// mocked-fetch calls and, for the hooks, real react-test-renderer mounts —
// not a unit-testing framework. They exist to catch the class of bug that
// type-checking alone has repeatedly missed in this package (see the
// individual test files for real examples: an extra React re-render, a
// retry loop hammering non-retryable 4xx errors, an IPv6 SSRF bypass, and
// more). Run `npm run build` first — these test the built package, not the
// TypeScript source directly.
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const testDir = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(testDir)
  .filter((f) => f.endsWith('.test.mjs'))
  .sort();

if (files.length === 0) {
  console.error('No *.test.mjs files found in test/.');
  process.exit(1);
}

let allPassed = true;

for (const file of files) {
  console.log(`\n▶ ${file}`);
  const result = spawnSync(process.execPath, [join(testDir, file)], { stdio: 'inherit' });
  if (result.status !== 0) {
    allPassed = false;
    console.error(`✖ ${file} failed (exit code ${result.status})`);
  }
}

console.log(allPassed ? '\nAll test files passed.' : '\nOne or more test files failed.');
process.exit(allPassed ? 0 : 1);
