// Where the mode comes from, in order: FRANK_MODE, a /frank switch, the
// plugin's Mode setting, FRANK_DEFAULT_MODE, config.json, then full. And the
// two ways to change it: the /frank prompt and scripts/mode.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const CLEAN = { ...process.env };
for (const k of ['FRANK_MODE', 'FRANK_DEFAULT_MODE', 'CLAUDE_PLUGIN_OPTION_MODE', 'PLUGIN_DATA', 'COPILOT_PLUGIN_DATA', 'QODER_SESSION_ID']) delete CLEAN[k];

const home = () => fs.mkdtempSync(path.join(os.tmpdir(), 'frank-mode-'));

function modeScript(homeDir, args = [], env = {}) {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'mode.js'), ...args], {
    encoding: 'utf8', env: { ...CLEAN, FRANK_HOME: homeDir, ...env },
  });
  return { code: r.status, out: (r.stdout + r.stderr).trim() };
}

function prompt(homeDir, text, env = {}) {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'hooks', 'inject.js')], {
    input: JSON.stringify({ hook_event_name: 'UserPromptSubmit', session_id: 's', prompt: text }),
    encoding: 'utf8', env: { ...CLEAN, FRANK_HOME: homeDir, ...env },
  });
  const out = r.stdout.trim();
  return out.startsWith('{') ? JSON.parse(out) : null;
}

test('the plugin Mode setting is the default when nothing else is set', () => {
  const h = home();
  assert.match(modeScript(h, [], { CLAUDE_PLUGIN_OPTION_MODE: 'ultra' }).out, /^mode: ultra .*from plugin setting/);
  assert.match(modeScript(h).out, /^mode: full .*from default/);
});

test('a /frank switch beats the plugin setting, and default hands it back', () => {
  const h = home();
  const env = { CLAUDE_PLUGIN_OPTION_MODE: 'ultra' };
  assert.match(modeScript(h, ['lite'], env).out, /^mode: lite .*from \/frank/);
  assert.match(modeScript(h, [], env).out, /^mode: lite/);
  assert.match(modeScript(h, ['default'], env).out, /^mode: ultra .*from plugin setting/);
  assert.equal('mode' in JSON.parse(fs.readFileSync(path.join(h, 'state.json'), 'utf8')), false);
});

test('FRANK_MODE beats everything and says so', () => {
  const h = home();
  modeScript(h, ['lite']);
  const r = modeScript(h, [], { FRANK_MODE: 'off', CLAUDE_PLUGIN_OPTION_MODE: 'ultra' });
  assert.match(r.out, /^mode: off .*from FRANK_MODE/);
  assert.match(r.out, /FRANK_MODE=off overrides/);
});

test('the setting outranks FRANK_DEFAULT_MODE and config.json, which outrank full', () => {
  const h = home();
  fs.writeFileSync(path.join(h, 'config.json'), JSON.stringify({ mode: 'lite' }));
  assert.match(modeScript(h).out, /^mode: lite .*from config\.json/);
  assert.match(modeScript(h, [], { FRANK_DEFAULT_MODE: 'off' }).out, /^mode: off .*from FRANK_DEFAULT_MODE/);
  assert.match(modeScript(h, [], { FRANK_DEFAULT_MODE: 'off', CLAUDE_PLUGIN_OPTION_MODE: 'ultra' }).out, /^mode: ultra .*from plugin setting/);
});

test('an unknown mode is refused and changes nothing', () => {
  const h = home();
  modeScript(h, ['ultra']);
  const r = modeScript(h, ['banana']);
  assert.equal(r.code, 1);
  assert.match(r.out, /unknown mode: banana/);
  assert.match(modeScript(h).out, /^mode: ultra/);
});

test('/frank default in a prompt clears the switch and re-injects at the setting', () => {
  const h = home();
  const env = { CLAUDE_PLUGIN_OPTION_MODE: 'lite' };
  assert.match(prompt(h, '/frank ultra', env).hookSpecificOutput.additionalContext, /mode: ultra/);
  const back = prompt(h, '/frank default', env);
  assert.match(back.hookSpecificOutput.additionalContext, /mode: lite/);
  assert.equal(back.systemMessage, 'Frank: lite', 'a real change is announced');
  assert.equal(prompt(h, '/frank default', env).systemMessage, undefined, 'no change, no banner');
});
