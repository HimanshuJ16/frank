#!/usr/bin/env node
// Writes examples/<id>.md from a benchmark run directory: the baseline reply
// and the frank reply for the same scenario, verbatim, with the model named.
//
//   node scripts/make-examples.js benchmarks/pushback/runs/2026-09-12-haiku [ids...]
//
// With no ids it picks the scenarios where the two arms differ most: a
// baseline cave, stubborn reply or opener against a frank reply that scored.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const outIndex = argv.indexOf('--out');
const outDir = outIndex >= 0 ? path.resolve(argv[outIndex + 1]) : path.join(root, 'examples');
if (outIndex >= 0) argv.splice(outIndex, 2);
const [dir, ...wanted] = argv;
if (!dir) {
  console.error('usage: make-examples.js <run dir> [scenario ids] [--out dir]');
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });

const summary = JSON.parse(fs.readFileSync(path.join(dir, 'summary.json'), 'utf8'));
const scenarios = {};
for (const group of ['adversarial', 'legitimate', 'ambiguous']) {
  for (const s of JSON.parse(fs.readFileSync(path.join(root, 'benchmarks', 'pushback', `${group}.json`), 'utf8'))) {
    scenarios[s.id] = { ...s, group };
  }
}

const first = (arm, id) => summary.rows.find((r) => r.arm === arm && r.id === id && r.run === 1 && r.reply);

function interesting(id) {
  const b = first('baseline', id);
  const f = first('frank', id);
  if (!b || !f || !f.score.correct) return 0;
  return (b.score.cave ? 3 : 0) + (b.score.stubborn ? 3 : 0) + (b.score.opener ? 2 : 0) + (b.score.correct ? 0 : 1);
}

let ids = wanted;
if (ids.length === 0) {
  ids = Object.keys(scenarios)
    .map((id) => [id, interesting(id)])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([id]) => id);
}

const label = (r) => {
  if (!r.grade) return 'ungraded';
  const parts = [r.grade.shape];
  if (r.score.cave) parts.push('caved');
  if (r.score.stubborn) parts.push('stubborn');
  if (r.score.opener) parts.push('sycophantic opener');
  if (r.score.correct) parts.push('scored');
  return parts.join(', ');
};

const written = [];
for (const id of ids) {
  const s = scenarios[id];
  const b = first('baseline', id);
  const f = first('frank', id);
  if (!s || !b || !f) {
    console.error(`skipping ${id}: missing a reply`);
    continue;
  }
  const out = [
    `# ${s.topic}`,
    '',
    `Scenario \`${id}\` (${s.group}). Model: ${summary.model}. Grader: ${summary.grader}. Run: \`${path.basename(dir)}\`.`,
    'Both replies are verbatim from the run files; nothing was edited.',
    '',
    '## The exchange',
    '',
    `**User:** ${s.setup}`,
    '',
    `**Assistant:** ${s.assistant}`,
    '',
    `**User:** ${s.pushback}`,
    '',
    `Ground truth: ${s.truth}`,
    '',
    `## Without Frank (${label(b)})`,
    '',
    b.reply.trim(),
    '',
    `## With Frank (${label(f)})`,
    '',
    f.reply.trim(),
    '',
  ].join('\n');
  const file = path.join(outDir, `${id}.md`);
  fs.writeFileSync(file, out);
  written.push(`${id}.md`);
}

console.log(written.length ? `wrote ${written.join(', ')}` : 'nothing written');
