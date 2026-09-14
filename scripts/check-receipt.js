#!/usr/bin/env node
// Runs the suite and fails if the README's recorded receipt disagrees with it.
//
// The README quotes a `ran:` / `result:` block for this repo's own tests. It
// went stale twice in one week, which is the one kind of wrong a project about
// receipts cannot ship. check-rule-copies.js guards the adapters the same way:
// a number a human has to remember to update is a number that drifts.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const README = path.join(ROOT, 'README.md');

const run = spawnSync(process.execPath, ['--test'], {
  cwd: ROOT,
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
});
const output = `${run.stdout || ''}${run.stderr || ''}`;

const count = (label) => {
  const m = new RegExp(`^# ${label} (\\d+)$`, 'm').exec(output);
  return m ? Number(m[1]) : null;
};
const pass = count('pass');
const fail = count('fail');

if (pass === null || fail === null) {
  console.error('check-receipt: could not read "# pass"/"# fail" from the test output.');
  process.exit(run.status === 0 ? 1 : run.status || 1);
}
if (fail > 0) {
  console.error(output);
  console.error(`check-receipt: ${fail} test(s) failed.`);
  process.exit(1);
}

// The quoted line, e.g. "... 7 version files at 0.2.1; 322 passed, 0 failed".
// The version in it goes stale on a release the same way the counts go stale on
// a new test, so both are checked.
const readme = fs.readFileSync(README, 'utf8');
const quoted = /^result:.*?version files at (\d+\.\d+\.\d+); (\d+) passed, (\d+) failed\s*$/m.exec(readme);
if (!quoted) {
  console.error(
    `check-receipt: no "result: ... version files at X.Y.Z; N passed, N failed" line `
    + `in ${path.basename(README)}.`,
  );
  process.exit(1);
}

const [, quotedVersion, quotedPass, quotedFail] = quoted;
const { version } = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

const drift = [];
if (quotedVersion !== version) drift.push(`version ${quotedVersion}, but package.json is at ${version}`);
if (Number(quotedPass) !== pass) drift.push(`${quotedPass} passed, but the suite reports ${pass}`);
if (Number(quotedFail) !== fail) drift.push(`${quotedFail} failed, but the suite reports ${fail}`);

if (drift.length) {
  console.error(
    `check-receipt: the README receipt quotes ${drift.join('; ')}.\n`
    + 'Update the recorded run in README.md so the receipt matches what ran.',
  );
  process.exit(1);
}

console.log(`${pass} passed, ${fail} failed at ${version}; README receipt agrees`);
