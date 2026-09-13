#!/usr/bin/env node
// What Frank has caught. Counters only; no transcript content is ever stored.
import fs from 'node:fs';
import { readStats, getMode, readSession } from '../hooks/lib/state.js';
import { SESSION_DIR, STATS_FILE } from '../hooks/lib/paths.js';

const LABELS = {
  blocks: 'receipts demanded',
  block_no_receipt: '  - claim with nothing run',
  block_contradiction: '  - claim contradicted by a failing run',
  block_receipt_not_run: '  - receipt citing a command that never ran',
  block_opener: '  - sycophantic opener (ultra)',
  openers: 'sycophantic openers seen',
  warned: 'warnings (lite mode)',
};

const stats = readStats();
const lifetime = stats.lifetime || {};

console.log(`frank: ${getMode()}`);
console.log(`stats file: ${STATS_FILE()}`);
if (stats.since) console.log(`counting since: ${stats.since}`);
console.log('');

const rows = Object.entries(LABELS).filter(([key]) => lifetime[key]);
if (rows.length === 0) {
  console.log('lifetime: nothing caught yet.');
} else {
  console.log('lifetime:');
  for (const [key, label] of rows) console.log(`  ${String(lifetime[key]).padStart(6)}  ${label}`);
}

// Same id the hooks see; Claude Code exports it to tool commands.
const sessionId = process.argv[2] || process.env.CLAUDE_CODE_SESSION_ID;
if (sessionId) {
  const s = readSession(sessionId);
  const blocks = Object.values(s.blocks || {}).reduce((a, b) => a + (Number(b) || 0), 0);
  console.log('');
  console.log(`this session (${sessionId}):`);
  console.log(`  ${String(blocks).padStart(6)}  receipts demanded`);
  console.log(`  ${String(s.openers || 0).padStart(6)}  sycophantic openers seen`);
  console.log(`  ${String((s.evidence || []).length).padStart(6)}  verification commands recorded`);
}

try {
  const open = fs.readdirSync(SESSION_DIR()).length;
  console.log('');
  console.log(`${open} session ledger${open === 1 ? '' : 's'} on disk (pruned after 7 days).`);
} catch {
  // no ledger directory yet
}
