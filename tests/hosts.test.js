// Claude Code, Codex, Copilot CLI and Qoder all run the same hook scripts and
// announce themselves through different env vars. Each one wants a slightly
// different JSON shape back. These pin both halves.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { detectHost } from '../hooks/lib/host.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// A leaked host var from the shell running the tests would steer every case.
const CLEAN = { ...process.env };
for (const k of ['PLUGIN_DATA', 'COPILOT_PLUGIN_DATA', 'CLAUDE_PLUGIN_ROOT', 'QODER_SESSION_ID', 'FRANK_MODE', 'FRANK_DEFAULT_MODE']) {
  delete CLEAN[k];
}

function runHook(name, input, env = {}) {
  const res = spawnSync(process.execPath, [path.join(ROOT, 'hooks', `${name}.js`)], {
    input: JSON.stringify(input),
    encoding: 'utf8',
    env: { ...CLEAN, FRANK_HOME: fs.mkdtempSync(path.join(os.tmpdir(), 'frank-host-')), ...env },
  });
  const out = res.stdout.trim();
  return { code: res.status, stdout: out, json: out.startsWith('{') ? JSON.parse(out) : null };
}

test('detectHost reads the env vars each host sets', () => {
  assert.equal(detectHost({}), 'claude');
  assert.equal(detectHost({ PLUGIN_DATA: '/x' }), 'codex');
  assert.equal(detectHost({ COPILOT_PLUGIN_DATA: '/x', PLUGIN_DATA: '/y' }), 'copilot');
  assert.equal(detectHost({ QODER_SESSION_ID: 'abc' }), 'qoder');
  // VS Code's Copilot never sets COPILOT_PLUGIN_DATA; only the plugin root gives it away.
  assert.equal(detectHost({ CLAUDE_PLUGIN_ROOT: 'C:\\u\\.vscode\\agent-plugins\\github.com\\x\\frank' }), 'copilot');
  assert.equal(detectHost({ CLAUDE_PLUGIN_ROOT: '/home/u/.claude/plugins/frank' }), 'claude');
});

test('Codex gets a FRANK:MODE badge next to the context', () => {
  const r = runHook('inject', { hook_event_name: 'SessionStart', source: 'startup' }, { PLUGIN_DATA: '/tmp/codex' });
  assert.equal(r.code, 0);
  assert.equal(r.json.systemMessage, 'FRANK:FULL');
  assert.equal(r.json.hookSpecificOutput.hookEventName, 'SessionStart');
  assert.match(r.json.hookSpecificOutput.additionalContext, /You are Frank/);
  assert.equal(r.json.additionalContext, undefined, 'Codex rejects top-level additionalContext');
});

test('Codex badge follows an @frank switch', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'frank-host-'));
  const r = runHook('inject', { hook_event_name: 'UserPromptSubmit', prompt: '@frank ultra' }, { PLUGIN_DATA: '/tmp/codex', FRANK_HOME: home });
  assert.equal(r.json.systemMessage, 'FRANK:ULTRA');
  const plain = runHook('inject', { hook_event_name: 'UserPromptSubmit', prompt: 'hi' }, { PLUGIN_DATA: '/tmp/codex', FRANK_HOME: home });
  assert.match(plain.json.hookSpecificOutput.additionalContext, /You are Frank/, 'Codex keeps the full rules on every prompt');
  const off = runHook('inject', { hook_event_name: 'UserPromptSubmit', prompt: '@frank off' }, { PLUGIN_DATA: '/tmp/codex', FRANK_HOME: home });
  assert.equal(off.json.systemMessage, 'FRANK:OFF');
});

test('Copilot only reads context on sessionStart', () => {
  const start = runHook('inject', { hook_event_name: 'SessionStart' }, { COPILOT_PLUGIN_DATA: '/tmp/cp' });
  assert.match(start.json.additionalContext, /You are Frank/);
  assert.equal(start.json.hookSpecificOutput, undefined);
  const prompt = runHook('inject', { hook_event_name: 'UserPromptSubmit', prompt: 'hi' }, { COPILOT_PLUGIN_DATA: '/tmp/cp' });
  assert.equal(prompt.stdout, '');
});

test('Copilot namespaced /frank:frank still switches the mode', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'frank-host-'));
  runHook('inject', { hook_event_name: 'UserPromptSubmit', prompt: '/frank:frank lite' }, { COPILOT_PLUGIN_DATA: '/tmp/cp', FRANK_HOME: home });
  assert.equal(JSON.parse(fs.readFileSync(path.join(home, 'state.json'), 'utf8')).mode, 'lite');
});

test('Claude Code announces the mode once, on startup only', () => {
  const start = runHook('inject', { hook_event_name: 'SessionStart', source: 'startup' });
  assert.equal(start.json.systemMessage, 'Frank: full');
  const prompt = runHook('inject', { hook_event_name: 'UserPromptSubmit', prompt: 'hi' });
  assert.equal(prompt.json.systemMessage, undefined);
});

test('the gate blocks with decision:block on Codex, feedback on Claude Code', () => {
  const stop = { hook_event_name: 'Stop', session_id: 's', last_assistant_message: 'Fixed it.' };
  const codex = runHook('gate', stop, { PLUGIN_DATA: '/tmp/codex' });
  assert.equal(codex.json.decision, 'block');
  const claude = runHook('gate', stop);
  assert.equal(claude.json.decision, undefined);
  assert.ok(claude.json.hookSpecificOutput.additionalContext);
});

test('Copilot agentStop is gated from the transcript file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frank-host-'));
  const transcript = path.join(dir, 't.jsonl');
  fs.writeFileSync(transcript, [
    JSON.stringify({ role: 'user', content: 'fix it' }),
    JSON.stringify({ role: 'assistant', content: [{ type: 'text', text: 'All tests pass.' }] }),
  ].join('\n'));
  const r = runHook('gate', { hook_event_name: 'agentStop', sessionId: 's', transcriptPath: transcript }, { COPILOT_PLUGIN_DATA: '/tmp/cp' });
  assert.equal(r.json.decision, 'block');
});

test('Copilot agentStop with an unreadable transcript stays quiet', () => {
  const r = runHook('gate', { hook_event_name: 'agentStop', sessionId: 's', transcriptPath: '/nope/none.jsonl' }, { COPILOT_PLUGIN_DATA: '/tmp/cp' });
  assert.equal(r.code, 0);
  assert.equal(r.stdout, '');
});

test('the ledger reads a Codex exit code out of tool_response', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'frank-host-'));
  const env = { PLUGIN_DATA: '/tmp/codex', FRANK_HOME: home };
  runHook('ledger', { hook_event_name: 'PostToolUse', session_id: 's', tool_name: 'apply_patch', tool_input: { command: '*** Begin Patch' } }, env);
  runHook('ledger', { hook_event_name: 'PostToolUse', session_id: 's', tool_name: 'Bash', tool_input: { command: 'npm test' }, tool_response: { exit_code: 1, output: '2 failing' } }, env);
  const r = runHook('gate', { hook_event_name: 'Stop', session_id: 's', turn_id: 't1', last_assistant_message: 'Fixed it.' }, env);
  assert.match(r.json.reason, /exited 1/);
});
