// The README tells people to run scripts/uninstall.js. It must list what it
// would remove, remove it only with --yes, and never touch anything outside
// Frank's own directory.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function run(home, ...args) {
  return spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'uninstall.js'), ...args], {
    encoding: 'utf8',
    env: { ...process.env, FRANK_HOME: home },
  });
}

test('dry run lists the state and removes nothing', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'frank-un-'));
  fs.writeFileSync(path.join(home, 'state.json'), '{"mode":"ultra"}');
  fs.writeFileSync(path.join(home, 'stats.json'), '{}');
  const r = run(home);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /state\.json/);
  assert.match(r.stdout, /dry run/);
  assert.ok(fs.existsSync(path.join(home, 'state.json')));
});

test('--yes removes the directory and says so', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'frank-un-'));
  fs.mkdirSync(path.join(home, 'sessions'));
  fs.writeFileSync(path.join(home, 'sessions', 'a.json'), '{}');
  const sibling = path.join(path.dirname(home), `${path.basename(home)}-keep`);
  fs.mkdirSync(sibling);
  fs.writeFileSync(path.join(sibling, 'x'), 'x');
  const r = run(home, '--yes');
  assert.equal(r.status, 0, r.stderr);
  assert.equal(fs.existsSync(home), false);
  assert.ok(fs.existsSync(path.join(sibling, 'x')), 'must not touch neighbouring directories');
  assert.match(r.stdout, /removed/);
  fs.rmSync(sibling, { recursive: true, force: true });
});

test('a machine with nothing installed is a no-op', () => {
  const home = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'frank-un-')), 'never-created');
  const r = run(home, '--yes');
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /nothing to remove/);
});
