// The two scripts the skills call take the session id from the environment on
// Claude Code, so /frank-verify and /frank-stats can show this session's ledger
// without an argument the model would have to guess.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const home = () => fs.mkdtempSync(path.join(os.tmpdir(), 'frank-scripts-'));

function run(script, args, env) {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', script), ...args], {
    encoding: 'utf8', env: { ...process.env, ...env },
  });
  return (r.stdout + r.stderr).trim();
}

function ledgerWith(homeDir, id) {
  fs.mkdirSync(path.join(homeDir, 'sessions'), { recursive: true });
  fs.writeFileSync(path.join(homeDir, 'sessions', id + '.json'), JSON.stringify({
    lastEditTs: 100, evidence: [{ ts: 200, cmd: 'npm test', exitCode: 0, category: 'test' }], blocks: { p1: 1 }, openers: 0,
  }));
}

test('suggest.js reads the session id from CLAUDE_CODE_SESSION_ID', () => {
  const h = home();
  ledgerWith(h, 'abc');
  const out = run('suggest.js', [h], { FRANK_HOME: h, CLAUDE_CODE_SESSION_ID: 'abc' });
  assert.match(out, /verification since last edit:/);
  assert.match(out, /npm test/);
  const none = run('suggest.js', [h], { FRANK_HOME: h, CLAUDE_CODE_SESSION_ID: '' });
  assert.doesNotMatch(none, /verification since last edit/);
});

test('stats.js adds the session block from CLAUDE_CODE_SESSION_ID', () => {
  const h = home();
  ledgerWith(h, 'abc');
  const out = run('stats.js', [], { FRANK_HOME: h, CLAUDE_CODE_SESSION_ID: 'abc' });
  assert.match(out, /this session \(abc\)/);
  assert.match(out, /1  receipts demanded/);
});
