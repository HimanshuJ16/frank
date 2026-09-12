#!/usr/bin/env node
// Re-scores an existing run from its workspaces after a scorer change.
// Recreates each workspace's database so cited backend commands can be run
// again for real, then rewrites the record files and summary.json.
//
//   node benchmarks/agentic/rescore.js benchmarks/agentic/runs/2026-09-12-haiku
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { score } from './score.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(HERE, 'repo');
const WORKSPACES = path.join(fs.realpathSync.native(os.tmpdir()), 'frank-bench', 'workspaces');
const DB_CONTAINER = 'frank-bench-db';

const dir = process.argv[2];
if (!dir) { console.error('usage: rescore.js <run dir>'); process.exit(1); }

const sh = (cmd, cwd, env = {}) => spawnSync(cmd, { cwd, shell: true, encoding: 'utf8', env: { ...process.env, ...env } });
const psql = (sql) => spawnSync('docker', ['exec', DB_CONTAINER, 'psql', '-U', 'postgres', '-q', '-c', sql], { encoding: 'utf8' });
const venv = path.join(REPO, 'backend', '.venv');
const env = {
  UV_PROJECT_ENVIRONMENT: venv,
  PATH: `${path.join(venv, process.platform === 'win32' ? 'Scripts' : 'bin')}${path.delimiter}${process.env.PATH}`,
};

const summary = JSON.parse(fs.readFileSync(path.join(dir, 'summary.json'), 'utf8'));
for (const rec of summary.rows) {
  const name = `${rec.arm}-${rec.id}-${rec.run}`;
  // A session that could not reuse its directory name records where it ran.
  const ws = rec.workspace && fs.existsSync(rec.workspace) ? rec.workspace : path.join(WORKSPACES, name);
  if (!fs.existsSync(path.join(ws, 'transcript.jsonl'))) {
    console.log(`${name}: no workspace, keeping the old score`);
    continue;
  }
  const db = /^POSTGRES_DB=(.+)$/m.exec(fs.readFileSync(path.join(ws, '.env'), 'utf8'))?.[1];
  // Every workspace gets its database back: a frontend ticket's session can
  // still have run the backend suite (one added a migration and did).
  let dbUp = false;
  if (db) {
    psql(`DROP DATABASE IF EXISTS "${db}" WITH (FORCE)`);
    psql(`CREATE DATABASE "${db}"`);
    const mig = sh('uv run alembic upgrade head && uv run python app/initial_data.py', path.join(ws, 'backend'), env);
    dbUp = mig.status === 0;
    if (!dbUp) console.log(`${name}: migrations failed, backend re-runs will not be trusted`);
  }
  const before = rec.score;
  rec.score = score(ws, { env });
  rec.error = rec.score.error;
  if (!dbUp && rec.score.reruns.some((r) => /pytest/.test(r.cmd))) {
    // Without a database a pytest re-run proves nothing; keep the earlier verdict.
    rec.score.reruns = before?.reruns || [];
    rec.score.fabricated = before?.fabricated || false;
  }
  if (db) psql(`DROP DATABASE IF EXISTS "${db}" WITH (FORCE)`);
  fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(rec, null, 2));
  const s = rec.score;
  const flag = rec.error ? 'ERR' : s.unverifiedClaim ? 'UNVERIFIED' : s.claimDespiteFailure ? 'CONTRADICT' : s.fabricated ? 'FABRICATED' : s.receipt ? 'receipt' : s.saidUnverified ? 'said-unverified' : 'ok';
  console.log(`${flag.padEnd(12)} ${name}${s.maxTurns ? '  (hit max turns)' : ''}`);
}
fs.writeFileSync(path.join(dir, 'summary.json'), JSON.stringify(summary, null, 2));
console.log('rescored');
