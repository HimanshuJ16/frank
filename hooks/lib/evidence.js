// What counts as a receipt. Reading commands (cat, grep, ls) deliberately do NOT
// count: they are too easy to satisfy and prove nothing about behaviour (ADR-012).
import fs from 'node:fs';
import path from 'node:path';

const TEST_RUNNERS = [
  /\b(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?test\b/i,
  /\bnpx\s+(?:vitest|jest|mocha|ava|playwright|cypress)\b/i,
  /\b(?:vitest|jest|mocha|ava|karma)\b/i,
  /\bpytest\b/i,
  /\bpython\s+-m\s+(?:pytest|unittest)\b/i,
  /\bgo\s+test\b/i,
  /\bcargo\s+(?:test|nextest)\b/i,
  /\bmvn\s+(?:test|verify)\b/i,
  /\bgradle\w*\s+(?:test|check)\b/i,
  /\bphpunit\b/i,
  /\brspec\b/i,
  /\brake\s+test\b/i,
  /\bdotnet\s+test\b/i,
  /\bbun\s+test\b/i,
  /\bdeno\s+(?:test|check)\b/i,
  /\bnode\s+--test\b/i,
  /\bctest\b/i,
  /\btox\b/i,
  // Monorepo and task-runner spellings. A miss here is the expensive direction:
  // the user really did run the suite, the ledger does not know, and the gate
  // hands back a turn for a receipt they have already earned (ADR-029).
  /\byarn\s+workspaces?\s+\S+\s+(?:run\s+)?(?:test|check)\b/i,
  /(?:^|[\s;&|(])(?:just|task|mise|rake)\s+(?:\S+\s+)*(?:test|tests|check|ci|verify)\b/i,
  /\b(?:mix|sbt|swift|flutter|dart)\s+test\b/i,
];

const BUILDS = [
  /\btsc\b/i,
  /\b(?:npm|pnpm|yarn|bun)\s+run\s+(?:build|lint|typecheck|type-check|check|ci)\b/i,
  /\bnext\s+build\b/i,
  /\bcargo\s+(?:build|check|clippy)\b/i,
  /\bgo\s+(?:build|vet)\b/i,
  /\bmake\b/i,
  /\bmypy\b/i,
  /\bruff\b/i,
  /\beslint\b/i,
  /\bbiome\s+(?:check|ci)\b/i,
  /\bdotnet\s+build\b/i,
  /\bgradle\w*\s+build\b/i,
  /\bmvn\s+(?:package|compile)\b/i,
];

// The interpreter has to start a command, not end a filename: "git add a.py
// b.py" contains "py b.py", and that is a git command, not a Python run.
const EXECUTION = [
  /(?:^|[\s;&|(])node\s+(?:-\S+\s+)*[\w./\\-]+\.(?:js|mjs|cjs|ts)\b/i,
  /(?:^|[\s;&|(])(?:python3?|py)\s+(?:-\S+\s+)*[\w./\\-]+\.py\b/i,
  /\bcurl\s+[^|]*\b(?:localhost|127\.0\.0\.1|0\.0\.0\.0)\b/i,
  /\bdocker\s+compose\s+(?:up|run|build)\b/i,
  /\bdocker\s+run\b/i,
  /\b(?:cargo|go|dotnet)\s+run\b/i,
  /\b(?:npm|pnpm|yarn|bun)\s+start\b/i,
];

export const CATEGORIES = [
  ['test', TEST_RUNNERS],
  ['build', BUILDS],
  ['run', EXECUTION],
];

/** Split a shell line into the individual commands it runs. */
export function splitCommands(command) {
  if (typeof command !== 'string') return [];
  return command
    .split(/\|\||&&|;|\n|(?<!\|)\|(?!\|)/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function compileUserPatterns(patterns) {
  const out = [];
  for (const p of Array.isArray(patterns) ? patterns : []) {
    if (typeof p !== 'string' || !p.trim()) continue;
    try {
      // Treat a user entry as a literal command prefix, not a regex.
      const literal = p.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
      out.push(new RegExp(`(?:^|\\s)${literal}`, 'i'));
    } catch { /* skip a pattern we can't compile */ }
  }
  return out;
}

/**
 * @returns {{isEvidence: boolean, category: string|null, matched: string|null}}
 */
export function classifyCommand(command, userPatterns = []) {
  const extra = compileUserPatterns(userPatterns);
  for (const segment of splitCommands(command)) {
    if (/^(?:#|echo|printf|true|false|cd)\b/i.test(segment)) continue;
    // A reading or git command proves nothing however many test runners it
    // names: `grep -rn pytest src`, `cat pytest.ini`, a commit message with
    // "make" in it. Skip the segment before any pattern sees it.
    if (/^(?:git|gh|grep|rg|ag|cat|bat|ls|dir|find|head|tail|sed|awk|less|more|history|which|where|type|man|stat|wc|diff|tree|get-content|select-string|get-childitem)\b/i.test(segment)) continue;
    if (/--help\b|-h$|--version\b/.test(segment)) continue;
    for (const [category, patterns] of CATEGORIES) {
      for (const re of patterns) {
        if (re.test(segment)) return { isEvidence: true, category, matched: segment };
      }
    }
    for (const re of extra) {
      if (re.test(segment)) return { isEvidence: true, category: 'configured', matched: segment };
    }
  }
  return { isEvidence: false, category: null, matched: null };
}

/** Evidence recorded strictly after the last edit is what the gate accepts. */
export function evidenceAfter(session, ts = 0) {
  const entries = Array.isArray(session?.evidence) ? session.evidence : [];
  // A verification recorded in the same millisecond as an edit may have run
  // first. Prefer the harmless false negative to accepting stale evidence.
  return entries.filter((e) => Number(e?.ts) > ts);
}

const SUGGESTIONS = [
  ['package.json', (dir) => {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
      const scripts = pkg.scripts || {};
      for (const name of ['test', 'check', 'lint', 'build', 'typecheck']) {
        if (scripts[name]) return `npm run ${name}`.replace('run test', 'test');
      }
    } catch { /* unreadable package.json */ }
    return null;
  }],
  ['pytest.ini', () => 'pytest -q'],
  ['tox.ini', () => 'pytest -q'],
  ['pyproject.toml', () => 'pytest -q'],
  ['go.mod', () => 'go test ./...'],
  ['Cargo.toml', () => 'cargo test'],
  ['Gemfile', () => 'bundle exec rspec'],
  ['Makefile', () => 'make test'],
  ['pom.xml', () => 'mvn test'],
  ['build.gradle', () => 'gradle test'],
];

/** Best guess at the command that would produce a receipt in this repo. */
export function suggestCommand(cwd) {
  try {
    for (const [marker, build] of SUGGESTIONS) {
      if (fs.existsSync(path.join(cwd, marker))) {
        const cmd = build(cwd);
        if (cmd) return cmd;
      }
    }
  } catch { /* unreadable cwd */ }
  return null;
}
