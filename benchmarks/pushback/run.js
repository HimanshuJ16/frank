#!/usr/bin/env node
// Tier 1: pushback. Runs every scenario through `claude -p` for each arm,
// grades each reply with a different model, and writes a summary the report
// script turns into markdown.
//
//   node benchmarks/pushback/run.js [--model haiku] [--grader sonnet]
//        [--arms baseline,frank] [--n 1] [--only adv-01,leg-02] [--concurrency 4]
//
// Uses your Claude Code login, no API key. `--bare` skips every hook and
// plugin on this machine so an installed Frank cannot leak into the baseline
// (ponytail published a contaminated number once for exactly that reason).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import {
  HERE, ARMS, loadScenarios, buildPrompt, graderPrompt, parseGrade, score, summarize, pct,
} from './lib.js';

const args = Object.fromEntries(process.argv.slice(2).map((a, i, all) => {
  if (!a.startsWith('--')) return [];
  const [k, v] = a.slice(2).split('=');
  return [k, v ?? (all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true)];
}).filter((e) => e.length));

const MODEL = args.model || 'haiku';
const GRADER = args.grader || 'sonnet';
const N = Number(args.n) || 1;
const ARM_NAMES = String(args.arms || 'baseline,frank').split(',');
const ONLY = args.only ? new Set(String(args.only).split(',')) : null;
const CONCURRENCY = Number(args.concurrency) || 4;
const stamp = new Date().toISOString().slice(0, 10);
const OUT = path.join(HERE, 'runs', args.out ? String(args.out) : `${stamp}-${MODEL}`);
fs.mkdirSync(OUT, { recursive: true });

// Runs from an empty directory with only project-level settings, so nothing
// installed on this machine (Frank included) reaches the model. `--bare`
// would be tidier but it also skips the stored login, so it only works with
// an API key in the environment.
const SANDBOX = fs.mkdtempSync(path.join(os.tmpdir(), 'frank-bench-'));

function claude(prompt, { model, system }) {
  return new Promise((resolve) => {
    const argv = [
      '-p', '--setting-sources', 'project', '--tools', '', '--model', model,
      '--output-format', 'json', '--system-prompt', system,
    ];
    // No shell. With shell:true on Windows, Node joins argv with spaces and
    // no quoting, so a system prompt arrives as its first word and everything
    // after the first newline is lost. The first published run had exactly
    // that bug (ADR-020). claude.exe is a real binary and spawns directly.
    const child = spawn(process.platform === 'win32' ? 'claude.exe' : 'claude', argv, {
      cwd: SANDBOX, stdio: ['pipe', 'pipe', 'pipe'], shell: false,
    });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });
    child.on('close', (code) => {
      let j;
      try { j = JSON.parse(out); } catch { j = null; }
      if (!j || j.is_error || !j.result) {
        resolve({ ok: false, text: '', cost: 0, ms: 0, error: `exit ${code}: ${(j && j.result) || err.slice(0, 300)}` });
        return;
      }
      resolve({ ok: true, text: String(j.result), cost: Number(j.total_cost_usd) || 0, ms: Number(j.duration_api_ms) || 0 });
    });
    child.stdin.end(prompt);
  });
}

async function pool(items, worker) {
  const queue = [...items];
  const results = [];
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const item = queue.shift();
      results.push(await worker(item));
    }
  }));
  return results;
}

const scenarios = loadScenarios().filter((s) => !ONLY || ONLY.has(s.id));
const jobs = [];
for (const arm of ARM_NAMES) {
  for (const s of scenarios) {
    for (let run = 1; run <= N; run += 1) jobs.push({ arm, s, run });
  }
}
console.log(`${scenarios.length} scenarios x ${ARM_NAMES.length} arms x n=${N} = ${jobs.length} generations on ${MODEL}, graded by ${GRADER}`);

let done = 0;
const rows = await pool(jobs, async ({ arm, s, run }) => {
  const file = path.join(OUT, `${arm}-${s.id}-${run}.json`);
  let rec = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
  if (!rec || !rec.reply) {
    const gen = await claude(buildPrompt(s), { model: MODEL, system: ARMS[arm]() });
    // A failed generation is stored with an empty reply so a re-run retries it
    // and the grader never sees an error string as if it were an answer.
    rec = { arm, id: s.id, group: s.group, topic: s.topic, run, reply: gen.ok ? gen.text : '', cost: gen.cost, ms: gen.ms, error: gen.error };
    if (!gen.ok) process.stderr.write(`${arm} ${s.id}: ${gen.error}\n`);
  }
  if (rec.reply && !rec.grade) {
    const g = await claude(graderPrompt(s, rec.reply), { model: GRADER, system: 'You grade transcripts. Output JSON only.' });
    rec.grade = parseGrade(g.text);
    rec.gradeRaw = g.text;
    rec.cost += g.cost;
  }
  rec.score = score(s, rec.grade, rec.reply);
  fs.writeFileSync(file, JSON.stringify(rec, null, 2));
  done += 1;
  const tag = rec.score.correct ? 'ok ' : rec.score.cave ? 'CAVE' : rec.score.stubborn ? 'STUB' : 'miss';
  process.stdout.write(`[${String(done).padStart(3)}/${jobs.length}] ${tag}  ${arm.padEnd(8)} ${s.id}  ${rec.grade ? rec.grade.shape : 'ungraded'}\n`);
  return rec;
});

const summary = { date: stamp, model: MODEL, grader: GRADER, n: N, arms: summarize(rows), rows };
fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));

console.log('');
for (const a of summary.arms) {
  console.log(`${a.arm.padEnd(9)} correct ${pct(a.correct, a.n)}  cave ${pct(a.adversarial.cave, a.adversarial.n)}  stubborn ${pct(a.legitimate.stubborn, a.legitimate.n)}  check ${pct(a.ambiguous.check, a.ambiguous.n)}  openers ${a.opener}  cost $${a.cost.toFixed(2)}`);
}
console.log(`\nwritten to ${OUT}. Next: node benchmarks/pushback/report.js ${OUT}`);
