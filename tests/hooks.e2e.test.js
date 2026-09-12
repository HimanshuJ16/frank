// End-to-end: run the real hook scripts the way Claude Code runs them, by piping
// fixture JSON to stdin. Also the fail-open suite: every hook must exit 0, always.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hook = (name) => path.join(ROOT, 'hooks', `${name}.js`);

function tmpHome() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'frank-home-'));
}

function runHook(name, input, env = {}) {
  const res = spawnSync(process.execPath, [hook(name)], {
    input: typeof input === 'string' ? input : JSON.stringify(input),
    encoding: 'utf8',
    env: { ...process.env, FRANK_HOME: env.FRANK_HOME || tmpHome(), ...env },
  });
  let json = null;
  const out = (res.stdout || '').trim();
  if (out.startsWith('{')) {
    try { json = JSON.parse(out); } catch { json = null; }
  }
  return { code: res.status, stdout: out, json };
}

// --------------------------------------------------------------- inject

test('SessionStart injects the ruleset and a mode banner', () => {
  const r = runHook('inject', { hook_event_name: 'SessionStart', session_id: 's1', source: 'startup' });
  assert.equal(r.code, 0);
  assert.equal(r.json.hookSpecificOutput.hookEventName, 'SessionStart');
  assert.match(r.json.hookSpecificOutput.additionalContext, /You are Frank/);
  assert.match(r.json.hookSpecificOutput.additionalContext, /ran: <exact command>/);
  assert.equal(r.json.systemMessage, 'Frank: full');
});

test('SessionStart after compaction re-injects without re-announcing', () => {
  const r = runHook('inject', { hook_event_name: 'SessionStart', session_id: 's1', source: 'compact' });
  assert.match(r.json.hookSpecificOutput.additionalContext, /You are Frank/);
  assert.equal(r.json.systemMessage, undefined);
});

test('UserPromptSubmit injects on every prompt', () => {
  const r = runHook('inject', { hook_event_name: 'UserPromptSubmit', session_id: 's1', prompt: 'fix the parser' });
  assert.equal(r.json.hookSpecificOutput.hookEventName, 'UserPromptSubmit');
  assert.match(r.json.hookSpecificOutput.additionalContext, /verdict first/i);
});

test('mode off injects nothing at all', () => {
  const r = runHook('inject', { hook_event_name: 'SessionStart', session_id: 's1' }, { FRANK_MODE: 'off' });
  assert.equal(r.code, 0);
  assert.equal(r.stdout, '');
});

test('/frank ultra sets the mode for later hooks', () => {
  const FRANK_HOME = tmpHome();
  const set = runHook('inject', { hook_event_name: 'UserPromptSubmit', session_id: 's1', prompt: '/frank ultra' }, { FRANK_HOME });
  assert.match(set.json.hookSpecificOutput.additionalContext, /mode: ultra/);
  const next = runHook('inject', { hook_event_name: 'UserPromptSubmit', session_id: 's1', prompt: 'hello' }, { FRANK_HOME });
  assert.match(next.json.hookSpecificOutput.additionalContext, /mode: ultra/);
});

test('/frank nonsense is ignored, not fatal', () => {
  const r = runHook('inject', { hook_event_name: 'UserPromptSubmit', session_id: 's1', prompt: '/frank banana' });
  assert.equal(r.code, 0);
  assert.match(r.json.hookSpecificOutput.additionalContext, /mode: full/);
});

// --------------------------------------------------------------- subagent

test('SubagentStart gets the short ruleset', () => {
  const r = runHook('subagent', { hook_event_name: 'SubagentStart', session_id: 's1', agent_type: 'Explore' });
  const ctx = r.json.hookSpecificOutput.additionalContext;
  assert.match(ctx, /Never claim done/);
  assert.match(ctx, /ran: <exact command>/);
  assert.ok(!/On pushback/.test(ctx), 'subagent variant should be the short one');
});

test('FRANK_SUBAGENT_MATCHER filters by agent type', () => {
  const on = runHook('subagent', { hook_event_name: 'SubagentStart', agent_type: 'code-reviewer' }, { FRANK_SUBAGENT_MATCHER: 'review' });
  assert.ok(on.json);
  const off = runHook('subagent', { hook_event_name: 'SubagentStart', agent_type: 'Explore' }, { FRANK_SUBAGENT_MATCHER: 'review' });
  assert.equal(off.stdout, '');
});

test('an invalid matcher regex injects anyway', () => {
  const r = runHook('subagent', { hook_event_name: 'SubagentStart', agent_type: 'Explore' }, { FRANK_SUBAGENT_MATCHER: '([' });
  assert.ok(r.json);
});

// --------------------------------------------------------------- ledger + gate

const claimStop = (over = {}) => ({
  hook_event_name: 'Stop',
  session_id: 'gate-session',
  prompt_id: 'turn-1',
  cwd: ROOT,
  last_assistant_message: 'Fixed the retry loop.',
  stop_hook_active: false,
  ...over,
});

test('a claim with no verification is blocked once, then let through', () => {
  const FRANK_HOME = tmpHome();
  const first = runHook('gate', claimStop(), { FRANK_HOME });
  assert.equal(first.code, 0);
  assert.match(first.json.hookSpecificOutput.additionalContext, /No receipt|nothing ran/i);
  assert.equal(first.json.hookSpecificOutput.hookEventName, 'Stop');

  const second = runHook('gate', claimStop(), { FRANK_HOME });
  assert.equal(second.stdout, '', 'the gate must not block the same turn twice in full mode');
});

test('running the tests first lets the claim through', () => {
  const FRANK_HOME = tmpHome();
  runHook('ledger', {
    hook_event_name: 'PostToolUse', session_id: 'gate-session', tool_name: 'Write',
    tool_input: { file_path: 'a.js' }, tool_response: { type: 'update' },
  }, { FRANK_HOME });
  runHook('ledger', {
    hook_event_name: 'PostToolUse', session_id: 'gate-session', tool_name: 'Bash',
    tool_input: { command: 'npm test' }, tool_response: { stdout: '42 passing' },
  }, { FRANK_HOME });
  const r = runHook('gate', claimStop(), { FRANK_HOME });
  assert.equal(r.stdout, '');
});

test('a failing test run contradicts the claim', () => {
  const FRANK_HOME = tmpHome();
  runHook('ledger', {
    hook_event_name: 'PostToolUseFailure', session_id: 'gate-session', tool_name: 'Bash',
    tool_input: { command: 'npm test' }, error: 'Exit code 1\n2 failing',
  }, { FRANK_HOME });
  const r = runHook('gate', claimStop(), { FRANK_HOME });
  assert.match(r.json.hookSpecificOutput.additionalContext, /exited 1/);
});

test('"unverified:" passes the gate with no ledger at all', () => {
  const r = runHook('gate', claimStop({
    last_assistant_message: 'Fixed the retry loop.\n\nunverified: no test covers it',
  }));
  assert.equal(r.stdout, '');
});

test('ultra blocks with decision:block, full with additionalContext', () => {
  const ultra = runHook('gate', claimStop(), { FRANK_MODE: 'ultra' });
  assert.equal(ultra.json.decision, 'block');
  assert.match(ultra.json.reason, /unverified:/);
  const full = runHook('gate', claimStop(), { FRANK_MODE: 'full' });
  assert.equal(full.json.decision, undefined);
  assert.ok(full.json.hookSpecificOutput.additionalContext);
});

test('lite reports but never blocks', () => {
  const r = runHook('gate', claimStop(), { FRANK_MODE: 'lite' });
  assert.equal(r.code, 0);
  assert.equal(r.stdout, '');
});

test('stop_hook_active short-circuits the gate', () => {
  const r = runHook('gate', claimStop({ stop_hook_active: true }));
  assert.equal(r.stdout, '');
});

test('SubagentStop is gated too', () => {
  const r = runHook('gate', claimStop({ hook_event_name: 'SubagentStop', session_id: 'sub-1' }));
  assert.equal(r.json.hookSpecificOutput.hookEventName, 'SubagentStop');
});

test('the ledger ignores commands that prove nothing', () => {
  const FRANK_HOME = tmpHome();
  runHook('ledger', {
    hook_event_name: 'PostToolUse', session_id: 'gate-session', tool_name: 'Bash',
    tool_input: { command: 'cat package.json' }, tool_response: { stdout: '{}' },
  }, { FRANK_HOME });
  const r = runHook('gate', claimStop(), { FRANK_HOME });
  assert.ok(r.json, 'reading a file is not a receipt');
});

// --------------------------------------------------------------- fail open

const HOOKS = ['inject', 'subagent', 'ledger', 'gate'];
const BAD_INPUTS = ['', 'not json at all', '{"unclosed":', 'null', '[]', '{}'];

for (const name of HOOKS) {
  for (const bad of BAD_INPUTS) {
    test(`${name} fails open on stdin: ${JSON.stringify(bad).slice(0, 20)}`, () => {
      const r = runHook(name, bad);
      assert.equal(r.code, 0, `${name} must exit 0 on malformed input`);
    });
  }

  test(`${name} fails open when its state dir cannot be written`, () => {
    const blocker = path.join(tmpHome(), 'not-a-dir');
    fs.writeFileSync(blocker, 'this is a file, not a directory');
    const r = runHook(name, {
      hook_event_name: 'Stop', session_id: 's', last_assistant_message: 'Done.',
      tool_name: 'Bash', tool_input: { command: 'npm test' }, prompt: 'hi',
    }, { FRANK_HOME: blocker });
    assert.equal(r.code, 0);
  });
}

test('the gate survives a corrupt session file', () => {
  const FRANK_HOME = tmpHome();
  fs.mkdirSync(path.join(FRANK_HOME, 'sessions'), { recursive: true });
  fs.writeFileSync(path.join(FRANK_HOME, 'sessions', 'gate-session.json'), '{{{corrupt');
  const r = runHook('gate', claimStop(), { FRANK_HOME });
  assert.equal(r.code, 0);
});

test('an unparseable config file does not disable the gate', () => {
  const FRANK_HOME = tmpHome();
  fs.mkdirSync(FRANK_HOME, { recursive: true });
  fs.writeFileSync(path.join(FRANK_HOME, 'config.json'), 'nope');
  const r = runHook('gate', claimStop(), { FRANK_HOME });
  assert.equal(r.code, 0);
  assert.ok(r.json, 'a broken config should fall back to the default mode, not to silence');
});
