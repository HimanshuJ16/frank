import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { TARGETS, render, rules, readTarget, ROOT } from '../scripts/adapters.js';

const body = rules();

test('the ruleset stays inside its token budget', () => {
  const lines = body.split('\n').length;
  assert.ok(lines <= 45, `rules/frank.md is ${lines} lines; the budget is 45`);
});

test('the ruleset carries the four rules the gate depends on', () => {
  assert.match(body, /unverified/i);
  assert.match(body, /ran: <exact command>/);
  assert.match(body, /HOLD/);
  assert.match(body, /UPDATE/);
  assert.match(body, /CHECK/);
});

for (const target of Object.keys(TARGETS)) {
  test(`adapter ${target} is on disk and matches the source`, () => {
    const actual = readTarget(target);
    assert.notEqual(actual, null, `${target} is missing; run npm run build:adapters`);
    assert.equal(actual, render(target, body), `${target} drifted from rules/frank.md`);
    assert.ok(actual.includes(body), `${target} does not contain the ruleset verbatim`);
  });
}

test('a CRLF checkout does not read as drift', () => {
  const target = path.join(ROOT, 'AGENTS.md');
  const original = fs.readFileSync(target, 'utf8');
  try {
    fs.writeFileSync(target, original.replace(/\r?\n/g, '\r\n'));
    const res = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'check-rule-copies.js')], {
      encoding: 'utf8',
    });
    assert.equal(res.status, 0, res.stderr);
  } finally {
    fs.writeFileSync(target, original);
  }
});

test('check-rule-copies fails when an adapter drifts', () => {
  const target = path.join(ROOT, 'AGENTS.md');
  const original = fs.readFileSync(target, 'utf8');
  try {
    fs.writeFileSync(target, `${original}\n- Never say no to the user.\n`);
    const res = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'check-rule-copies.js')], {
      encoding: 'utf8',
    });
    assert.equal(res.status, 1);
    assert.match(res.stderr, /AGENTS\.md/);
  } finally {
    fs.writeFileSync(target, original);
  }
});

test('the plugin manifest points at hooks that exist', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude-plugin', 'plugin.json'), 'utf8'));
  const hooksFile = path.join(ROOT, manifest.hooks.replace('./', ''));
  const config = JSON.parse(fs.readFileSync(hooksFile, 'utf8'));
  // Codex reads the same file and only understands shell form, so every entry
  // is `node "${CLAUDE_PLUGIN_ROOT}/hooks/<script>.js"`. The quotes matter:
  // Windows install paths have spaces in them.
  const scripts = new Set();
  for (const entries of Object.values(config.hooks)) {
    for (const entry of entries) {
      for (const h of entry.hooks) {
        assert.equal(h.type, 'command');
        const m = /^node "\$\{CLAUDE_PLUGIN_ROOT\}\/(hooks\/[\w-]+\.js)"$/.exec(h.command);
        assert.ok(m, `unexpected hook command: ${h.command}`);
        assert.ok(h.timeout > 0 && h.timeout <= 15, 'hooks must have a short timeout');
        scripts.add(m[1]);
      }
    }
  }
  for (const rel of scripts) {
    assert.ok(fs.existsSync(path.join(ROOT, rel)), `${rel} is referenced but missing`);
  }
});

test('the marketplace entry names the plugin', () => {
  const mk = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude-plugin', 'marketplace.json'), 'utf8'));
  assert.equal(mk.name, 'frank');
  assert.equal(mk.plugins[0].name, 'frank');
  assert.ok(mk.owner.name);
});

test('every shipped skill has frontmatter with a description', () => {
  const dir = path.join(ROOT, 'skills');
  const names = fs.readdirSync(dir);
  assert.ok(names.length >= 5, 'expected the five /frank skills');
  for (const name of names) {
    const file = path.join(dir, name, 'SKILL.md');
    assert.ok(fs.existsSync(file), `${name}/SKILL.md is missing`);
    const text = fs.readFileSync(file, 'utf8');
    assert.match(text, /^---\n/, `${name}: no frontmatter`);
    assert.match(text, /\ndescription: \S/, `${name}: no description`);
    assert.match(text, new RegExp(`\\nname: ${name}\\n`), `${name}: name must match the directory`);
  }
});
