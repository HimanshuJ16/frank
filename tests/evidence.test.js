import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { classifyCommand, splitCommands, evidenceAfter, suggestCommand } from '../hooks/lib/evidence.js';

const EVIDENCE = [
  ['npm test', 'test'],
  ['npm test -- --runInBand', 'test'],
  ['pnpm test', 'test'],
  ['yarn test', 'test'],
  ['bun test', 'test'],
  ['npx vitest run', 'test'],
  ['pytest -q', 'test'],
  ['python -m pytest tests/', 'test'],
  ['go test ./...', 'test'],
  ['cargo test', 'test'],
  ['mvn test', 'test'],
  ['./gradlew test', 'test'],
  ['dotnet test', 'test'],
  ['node --test tests/', 'test'],
  ['bundle exec rspec spec/', 'test'],
  ['tsc --noEmit', 'build'],
  ['npm run build', 'build'],
  ['npm run typecheck', 'build'],
  ['cargo clippy', 'build'],
  ['go build ./...', 'build'],
  ['make', 'build'],
  ['mypy src', 'build'],
  ['ruff check .', 'build'],
  ['npx eslint src --max-warnings 0', 'build'],
  ['node scripts/smoke.js', 'run'],
  ['python manage.py check', 'run'],
  ['curl -s http://localhost:3000/health', 'run'],
  ['docker compose up -d', 'run'],
  ['cargo run --example demo', 'run'],
  ['cd api && pytest', 'test'],
  ['npm run lint && npm test', 'build'],
];

for (const [cmd, category] of EVIDENCE) {
  test(`evidence: ${cmd}`, () => {
    const r = classifyCommand(cmd);
    assert.equal(r.isEvidence, true, `expected evidence: ${cmd}`);
    assert.equal(r.category, category);
  });
}

const NOT_EVIDENCE = [
  'cat src/index.js',
  'grep -rn TODO src',
  'ls -la',
  'git status',
  'git commit -m "fix"',
  'git log --oneline -5',
  'echo "npm test"',
  'npm test --help',
  'npm install',
  'mkdir -p build',
  'code .',
  'sed -n 1,20p file.js',
  'rg "should work"',
  'npm run dev',
  // "py b.py" inside a git command is not a Python run (caught by tier 2)
  'git add backend/app/api/routes/items.py backend/app/models.py',
  'git commit -m "add tests.py and conftest.py"',
  'ls app/main.py tests/test_items.py',
  'cat scripts/run.js lib/index.js',
  // a reading or git command never counts, whatever it mentions
  'git commit -m "make the tests pass"',
  'grep -rn pytest src',
  'git log --grep tsc',
  'rg "npm test" docs',
  'cat pytest.ini',
  'ls tests/ && cat pytest.ini',
  'history | grep make',
  'Get-Content pytest.ini',
  'git diff -- tests/test_items.py',
];

for (const cmd of ['python3 -u scripts/check.py', 'py app/x.py', 'node --enable-source-maps dist/server.js', 'cd backend && python -m pytest tests/api']) {
  test(`evidence with flags: ${cmd}`, () => {
    assert.equal(classifyCommand(cmd).isEvidence, true, `expected evidence: ${cmd}`);
  });
}

for (const cmd of NOT_EVIDENCE) {
  test(`not evidence: ${cmd}`, () => {
    assert.equal(classifyCommand(cmd).isEvidence, false, `false positive: ${cmd}`);
  });
}

test('user-configured commands count', () => {
  // A project-local script no built-in pattern can know about.
  assert.equal(classifyCommand('./scripts/smoke.sh').isEvidence, false);
  assert.equal(classifyCommand('./scripts/smoke.sh', ['./scripts/smoke.sh']).isEvidence, true);
  assert.equal(classifyCommand('./scripts/smoke.sh', ['./scripts/smoke.sh']).category, 'configured');
});

test('monorepo and task-runner spellings count', () => {
  for (const cmd of ['yarn workspace api test', 'just test', 'task check', 'mix test', 'rake ci']) {
    assert.equal(classifyCommand(cmd).isEvidence, true, `missed: ${cmd}`);
  }
  // Still not evidence: the word appears, the runner does not run.
  assert.equal(classifyCommand('git commit -m "just test it"').isEvidence, false);
  assert.equal(classifyCommand('echo just test').isEvidence, false);
});

test('a malformed user pattern is skipped, not fatal', () => {
  assert.equal(classifyCommand('npm test', ['[', null, 42]).isEvidence, true);
});

test('splitCommands handles chains', () => {
  assert.deepEqual(splitCommands('a && b; c | d'), ['a', 'b', 'c', 'd']);
  assert.deepEqual(splitCommands(undefined), []);
});

test('evidenceAfter filters by timestamp', () => {
  const session = { evidence: [{ ts: 10 }, { ts: 20 }, { ts: 30 }] };
  assert.equal(evidenceAfter(session, 20).length, 1);
  assert.equal(evidenceAfter(session, 0).length, 3);
  assert.equal(evidenceAfter({}, 0).length, 0);
});

test('suggestCommand reads the repo', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frank-suggest-'));
  assert.equal(suggestCommand(dir), null);
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ scripts: { test: 'vitest' } }));
  assert.equal(suggestCommand(dir), 'npm test');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('suggestCommand survives a broken package.json', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frank-suggest-'));
  fs.writeFileSync(path.join(dir, 'package.json'), '{ not json');
  assert.equal(suggestCommand(dir), null);
  fs.rmSync(dir, { recursive: true, force: true });
});
