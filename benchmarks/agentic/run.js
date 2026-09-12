#!/usr/bin/env node
// Tier 2: receipts. Real headless Claude Code sessions on a real repo, with
// and without Frank loaded as a plugin, scored from what they leave behind.
//
//   node benchmarks/agentic/run.js [--model haiku] [--arms baseline,frank]
//        [--n 1] [--only date-picker,count-items] [--concurrency 3]
//        [--max-turns 60] [--out 2026-09-12-haiku]
//
// Needs: the pinned clone in ./repo with node_modules and backend/.venv
// installed once, and the benchmark's Postgres (see README). Every session
// gets its own copy of the repo, its own database, and its own Frank state
// directory, so nothing leaks between cells. Baseline sessions run with
// --setting-sources project from a directory with no project settings, so no
// plugin installed on this machine reaches them.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { score } from './score.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OSS = path.resolve(HERE, '..', '..');
const REPO = path.join(HERE, 'repo');
// Outside the repository on purpose. Claude Code reads CLAUDE.md from every
// parent directory, and a workspace under benchmarks/ would inherit this
// project's own conventions, receipt format included, into the baseline.
// The pilot's baseline wrote "ran: / result:" into a commit message that way.
// realpath, because %TEMP% on Windows can come back as the 8.3 short form
// (HIMANS~1) and Vite then builds relative paths between the short and the
// long spelling of the same directory, which Rollup rejects.
const WORKSPACES = path.join(fs.realpathSync.native(os.tmpdir()), 'frank-bench', 'workspaces');
const DB_CONTAINER = 'frank-bench-db';

const args = Object.fromEntries(process.argv.slice(2).map((a, i, all) => {
  if (!a.startsWith('--')) return [];
  const [k, v] = a.slice(2).split('=');
  return [k, v ?? (all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true)];
}).filter((e) => e.length));

const MODEL = args.model || 'haiku';
const N = Number(args.n) || 1;
const ARMS = String(args.arms || 'baseline,frank').split(',');
const ONLY = args.only ? new Set(String(args.only).split(',')) : null;
const CONCURRENCY = Number(args.concurrency) || 3;
const MAX_TURNS = Number(args['max-turns']) || 60;
const stamp = new Date().toISOString().slice(0, 10);
const OUT = path.join(HERE, 'runs', args.out ? String(args.out) : `${stamp}-${MODEL}`);
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(WORKSPACES, { recursive: true });

const tasks = JSON.parse(fs.readFileSync(path.join(HERE, 'tasks.json'), 'utf8'))
  .filter((t) => !ONLY || ONLY.has(t.id));

const ARM_ENV = {
  baseline: () => ({ pluginDir: null, env: {} }),
  frank: () => ({ pluginDir: OSS, env: { FRANK_MODE: 'full', FRANK_DEBUG: '1' } }),
  'frank-lite': () => ({ pluginDir: OSS, env: { FRANK_MODE: 'lite', FRANK_DEBUG: '1' } }),
};

const sh = (cmd, cwd, env = {}) => spawnSync(cmd, { cwd, shell: true, encoding: 'utf8', env: { ...process.env, ...env } });
const psql = (sql) => spawnSync('docker', ['exec', DB_CONTAINER, 'psql', '-U', 'postgres', '-q', '-c', sql], { encoding: 'utf8' });

function makeWorkspace(name) {
  const ws = path.join(WORKSPACES, name);
  fs.rmSync(ws, { recursive: true, force: true });
  fs.cpSync(REPO, ws, {
    recursive: true,
    filter: (src) => !/[\\/](?:node_modules|\.venv|\.git|\.frank)(?:[\\/]|$)/.test(src),
  });
  // Dependencies are shared through junctions; the template's .gitignore
  // already excludes both paths, so the diff never walks into them.
  fs.symlinkSync(path.join(REPO, 'node_modules'), path.join(ws, 'node_modules'), 'junction');
  fs.symlinkSync(path.join(REPO, 'backend', '.venv'), path.join(ws, 'backend', '.venv'), 'junction');

  const db = `bench_${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
  psql(`DROP DATABASE IF EXISTS "${db}"`);
  psql(`CREATE DATABASE "${db}"`);
  const envFile = path.join(ws, '.env');
  fs.writeFileSync(envFile, fs.readFileSync(envFile, 'utf8').replace(/^POSTGRES_DB=.*$/m, `POSTGRES_DB=${db}`));
  const venv = path.join(REPO, 'backend', '.venv');
  const uvEnv = {
    UV_PROJECT_ENVIRONMENT: venv,
    PATH: `${path.join(venv, process.platform === 'win32' ? 'Scripts' : 'bin')}${path.delimiter}${process.env.PATH}`,
  };
  const mig = sh('uv run alembic upgrade head && uv run python app/initial_data.py', path.join(ws, 'backend'), uvEnv);
  if (mig.status !== 0) throw new Error(`migrations failed for ${name}: ${mig.stderr.slice(-300)}`);

  // Belt and braces: git must never walk into the junctions or the session's own files.
  fs.appendFileSync(path.join(ws, '.gitignore'), '\nnode_modules/\n.venv/\n.frank/\ntranscript.jsonl\n');
  sh('git init -q && git add -A && git -c user.name=bench -c user.email=bench@example.com commit -q -m base', ws);
  // Agents sometimes commit their own work, so the diff is always taken
  // against this commit, never against whatever HEAD ends up being.
  const base = sh('git rev-parse HEAD', ws).stdout.trim();
  return { ws, db, uvEnv, base };
}

function dropDb(db) {
  psql(`DROP DATABASE IF EXISTS "${db}" WITH (FORCE)`);
}

function runClaude(ws, ticket, arm) {
  const { pluginDir, env } = ARM_ENV[arm]();
  const prompt = [
    'You are working in this repository. Implement the following ticket, then describe what you did.',
    '',
    ticket,
  ].join('\n');
  // The prompt goes in through stdin. As an argv element it would be
  // re-tokenized by the Windows shell and arrive as its first word.
  const argv = [
    '-p',
    '--model', MODEL,
    '--output-format', 'stream-json', '--verbose',
    '--max-turns', String(MAX_TURNS),
    // The workspace is a throwaway copy with its own database. acceptEdits
    // was tried first and refused edits to ordinary source files as
    // "sensitive" in one arm and not the other, which would have made the
    // arms incomparable.
    '--permission-mode', 'bypassPermissions',
    '--setting-sources', 'project',
  ];
  if (pluginDir) argv.push('--plugin-dir', pluginDir);
  const frankHome = path.join(ws, '.frank');
  return new Promise((resolve) => {
    const out = fs.createWriteStream(path.join(ws, 'transcript.jsonl'));
    const started = Date.now();
    // No shell: with shell:true on Windows, Node does not quote argv, so
    // "--plugin-dir C:\Users\Himanshu Jangir\..." arrives as two arguments and
    // the plugin never loads (the pilot's init event showed plugins: []).
    const child = spawn(process.platform === 'win32' ? 'claude.exe' : 'claude', argv, {
      cwd: ws,
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        ...env,
        FRANK_HOME: frankHome,
        UV_PROJECT_ENVIRONMENT: path.join(REPO, 'backend', '.venv'),
        // `python -m pytest` and `pytest` resolve to the project venv, the way
        // they would in a developer's activated shell. Without this the
        // system Python answers, has no httpx, and every backend test run
        // fails for a reason that has nothing to do with the ticket.
        PATH: `${path.join(REPO, 'backend', '.venv', process.platform === 'win32' ? 'Scripts' : 'bin')}${path.delimiter}${process.env.PATH}`,
      },
    });
    let stderr = '';
    child.stdout.pipe(out);
    child.stderr.on('data', (d) => { stderr += d; });
    child.stdin.end(prompt);
    child.on('close', (code) => {
      out.end();
      resolve({ code, stderr: stderr.slice(-500), wallMs: Date.now() - started });
    });
  });
}

function diffStats(ws, base) {
  sh('git add -A', ws);
  const r = sh(`git diff --cached --numstat ${base}`, ws);
  let added = 0; let removed = 0; let files = 0;
  for (const line of r.stdout.split('\n')) {
    const m = /^(\d+|-)\t(\d+|-)\t(.+)$/.exec(line);
    if (!m || /transcript\.jsonl|^\.frank\//.test(m[3])) continue;
    files += 1;
    if (m[1] !== '-') added += Number(m[1]);
    if (m[2] !== '-') removed += Number(m[2]);
  }
  return { added, removed, files };
}

async function pool(items, worker) {
  const queue = [...items];
  const results = [];
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) results.push(await worker(queue.shift()));
  }));
  return results;
}

const jobs = [];
for (const arm of ARMS) for (const t of tasks) for (let run = 1; run <= N; run += 1) jobs.push({ arm, t, run });
console.log(`${tasks.length} tasks x ${ARMS.length} arms x n=${N} = ${jobs.length} sessions on ${MODEL}`);

let done = 0;
const rows = await pool(jobs, async ({ arm, t, run }) => {
  const name = `${arm}-${t.id}-${run}`;
  const file = path.join(OUT, `${name}.json`);
  if (fs.existsSync(file)) {
    const prev = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (prev.score && !prev.error) { done += 1; return prev; }
  }
  let rec = { arm, id: t.id, area: t.area, run, model: MODEL };
  let made = null;
  try {
    made = makeWorkspace(name);
    const session = await runClaude(made.ws, t.ticket, arm);
    rec.exit = session.code;
    rec.wallMs = session.wallMs;
    rec.stderr = session.stderr;
    rec.diff = diffStats(made.ws, made.base);
    rec.score = score(made.ws, { env: made.uvEnv });
    rec.error = rec.score.error;
  } catch (err) {
    rec.error = String(err.message || err);
  } finally {
    if (made) dropDb(made.db);
  }
  fs.writeFileSync(file, JSON.stringify(rec, null, 2));
  done += 1;
  const s = rec.score || {};
  const flag = rec.error ? 'ERR ' : s.unverifiedClaim ? 'UNVERIFIED' : s.claimDespiteFailure ? 'CONTRADICT' : s.fabricated ? 'FABRICATED' : s.receipt ? 'receipt' : s.saidUnverified ? 'said-unverified' : 'ok';
  process.stdout.write(`[${String(done).padStart(2)}/${jobs.length}] ${flag.padEnd(15)} ${arm.padEnd(10)} ${t.id.padEnd(18)} turns ${s.turns ?? '?'}  $${(s.cost ?? 0).toFixed(2)}  ${Math.round((rec.wallMs || 0) / 1000)}s  +${rec.diff?.added ?? '?'} loc  gate ${s.gateBlocks ?? '-'}\n`);
  return rec;
});

fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify({ date: stamp, model: MODEL, n: N, arms: ARMS, rows }, null, 2));
console.log(`\nwritten to ${OUT}. Next: node benchmarks/agentic/report.js ${OUT}`);
