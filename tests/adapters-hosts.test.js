// One smoke test per host adapter. Each fails if the manifest goes missing,
// points at a file that is not there, or stops carrying the rules. None of
// them need the host installed.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { check, VERSION_FILES } from '../scripts/check-versions.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const json = (rel) => JSON.parse(read(rel).replace(/^﻿/, ''));
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

const SKILLS = ['frank', 'frank-verify', 'frank-review', 'frank-stats', 'frank-help'];
// Phrases the rules cannot lose. If a reword drops one, every adapter test says so.
const INVARIANTS = ['You are Frank', 'ran: <exact command>', 'unverified', 'HOLD', 'UPDATE', 'CHECK'];

test('versions agree across every manifest', () => {
  const { shared, problems } = check({});
  assert.deepEqual(problems, []);
  assert.match(shared, /^\d+\.\d+\.\d+$/);
  assert.ok(VERSION_FILES.length >= 7);
});

test('a release tag that does not match the version is caught', () => {
  const { problems } = check({ GITHUB_REF_TYPE: 'tag', GITHUB_REF_NAME: 'v99.0.0' });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /v99\.0\.0/);
});

test('Codex: manifest points at the shared hooks file and the skills', () => {
  const m = json('.codex-plugin/plugin.json');
  assert.equal(m.name, 'frank');
  assert.ok(exists(m.hooks.replace('./', '')), `${m.hooks} missing`);
  assert.ok(exists(m.skills.replace('./', '')));
  assert.equal(m.hooks, json('.claude-plugin/plugin.json').hooks, 'Claude Code and Codex must load the same hooks');
});

test('Copilot CLI: plugin manifest, marketplace and hooks file agree', () => {
  const m = json('.github/plugin/plugin.json');
  const mk = json('.github/plugin/marketplace.json');
  assert.equal(m.name, 'frank');
  assert.equal(mk.plugins[0].name, 'frank');
  assert.equal(mk.plugins[0].hooks, m.hooks);
  const hooks = json(m.hooks);
  assert.equal(hooks.version, 1);
  for (const [event, entries] of Object.entries(hooks.hooks)) {
    assert.ok(['sessionStart', 'userPromptSubmitted', 'postToolUse', 'agentStop'].includes(event), `unexpected Copilot event ${event}`);
    for (const h of entries) {
      for (const shell of ['bash', 'powershell']) {
        const script = /hooks[\\/]+([\w-]+\.js)/.exec(h[shell]);
        assert.ok(script, `${event}.${shell} does not reference a hook script`);
        assert.ok(exists(`hooks/${script[1]}`), `hooks/${script[1]} missing`);
      }
      assert.ok(h.timeoutSec <= 10);
    }
  }
});

test('Gemini CLI: manifest is pinned and its context file carries the rules', () => {
  const m = json('gemini-extension.json');
  assert.equal(m.name, 'frank');
  assert.match(m.version, /^\d+\.\d+\.\d+$/);
  const context = read(m.contextFileName);
  for (const phrase of INVARIANTS) assert.ok(context.includes(phrase), `${m.contextFileName} lost "${phrase}"`);
  // Gemini auto-loads hooks/hooks.json; ours use Claude/Codex event names.
  assert.equal(exists('hooks/hooks.json'), false, 'hooks/hooks.json would be auto-loaded by Gemini');
});

test('Gemini and OpenCode ship a command for every skill', () => {
  for (const name of SKILLS) {
    assert.ok(exists(`commands/${name}.toml`), `commands/${name}.toml missing`);
    assert.ok(exists(`.opencode/command/${name}.md`), `.opencode/command/${name}.md missing`);
    const toml = read(`commands/${name}.toml`);
    assert.match(toml, /^description = ".+"$/m);
    assert.match(toml, /^prompt = ".+"$/m);
  }
});

test('Qoder, Devin, Grok and the root manifest name the plugin', () => {
  assert.equal(json('.qoder-plugin/plugin.json').name, 'frank');
  assert.ok(exists(json('.qoder-plugin/plugin.json').hooks.replace('./', '')));
  assert.equal(json('.devin-plugin/plugin.json').name, 'frank');
  assert.equal(json('.grok-plugin/marketplace.json').plugins[0].name, 'frank');
  assert.equal(json('plugin.json').name, 'frank');
});

test('the Qoder hooks template references scripts that exist', () => {
  const hooks = json('hooks/qoder-hooks.json').hooks;
  for (const entries of Object.values(hooks)) {
    for (const e of entries) {
      for (const h of e.hooks) {
        const m = /FRANK_DIR\/(hooks\/[\w-]+\.js)/.exec(h.command);
        assert.ok(m && exists(m[1]), `bad command ${h.command}`);
      }
    }
  }
});

test('the npm package ships what the README tells people to run', () => {
  const pkg = json('package.json');
  for (const rel of ['hooks/', 'skills/', 'scripts/', 'rules/', '.opencode/', 'AGENTS.md']) {
    assert.ok(pkg.files.includes(rel), `package.json files must include ${rel}`);
  }
  assert.equal(pkg.exports['.'], './.opencode/plugins/frank.mjs');
  assert.ok(exists('scripts/uninstall.js'));
});

test('OpenCode: the plugin injects the rules and persists /frank switches', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'frank-opencode-'));
  process.env.FRANK_HOME = home;
  delete process.env.FRANK_MODE;
  const mod = await import(pathToFileURL(path.join(ROOT, '.opencode', 'plugins', 'frank.mjs')));
  const hooks = await mod.default({});

  const config = {};
  await hooks.config(config);
  for (const name of SKILLS) assert.ok(config.command[name], `command ${name} not registered`);
  assert.ok(config.skills.paths.some((p) => p.endsWith('skills')));

  const out = { system: ['You are a helpful assistant.'] };
  await hooks['experimental.chat.system.transform']({ model: {} }, out);
  assert.equal(out.system.length, 1, 'must extend the existing system entry, not add one');
  assert.match(out.system[0], /You are Frank/);
  assert.match(out.system[0], /mode: full/);

  await hooks['command.execute.before']({ command: 'frank', arguments: 'off', sessionID: 's' });
  const silent = { system: [] };
  await hooks['experimental.chat.system.transform']({ model: {} }, silent);
  assert.deepEqual(silent.system, []);

  await hooks['command.execute.before']({ command: 'frank', arguments: 'nonsense', sessionID: 's' });
  assert.equal(JSON.parse(fs.readFileSync(path.join(home, 'state.json'), 'utf8')).mode, 'off', 'a bad argument must not change the mode');

  await hooks['command.execute.before']({ command: 'commit', arguments: 'ultra', sessionID: 's' });
  assert.equal(JSON.parse(fs.readFileSync(path.join(home, 'state.json'), 'utf8')).mode, 'off', 'other commands must not touch the mode');

  const parsed = mod.parseCommandFile(path.join(ROOT, '.opencode', 'command', 'frank.md'));
  assert.ok(parsed.description);
  assert.match(parsed.template, /\$ARGUMENTS/);
  delete process.env.FRANK_HOME;
});
