#!/usr/bin/env node
// Counts sycophantic openers and unverified completion claims in your own
// Claude Code transcripts. Reads local files only; nothing leaves the machine.
//
//   node scripts/count.js [transcript-dir] [--json]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { detectOpener, detectClaim, detectReceipt } from '../hooks/lib/claims.js';

const args = process.argv.slice(2).filter((a) => a !== '--json');
const asJson = process.argv.includes('--json');
const root = args[0] || path.join(os.homedir(), '.claude', 'projects');

function* transcripts(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* transcripts(full);
    else if (entry.name.endsWith('.jsonl')) yield full;
  }
}

/** Assistant text, whatever shape the transcript line uses. */
function assistantText(line) {
  let record;
  try {
    record = JSON.parse(line);
  } catch {
    return null;
  }
  const message = record?.message ?? record;
  if (message?.role !== 'assistant') return null;
  const content = message.content;
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return null;
  return content.filter((c) => c?.type === 'text').map((c) => c.text).join('\n');
}

const totals = {
  files: 0, messages: 0, openers: 0, claims: 0, claimsWithReceipt: 0, unverified: 0,
};
const phrases = new Map();

for (const file of transcripts(root)) {
  totals.files += 1;
  const rl = readline.createInterface({
    input: fs.createReadStream(file, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });
  // eslint-disable-next-line no-await-in-loop
  for await (const line of rl) {
    const text = assistantText(line);
    if (!text || !text.trim()) continue;
    totals.messages += 1;

    const opener = detectOpener(text);
    if (opener.opener) {
      totals.openers += 1;
      const key = opener.matched.toLowerCase();
      phrases.set(key, (phrases.get(key) || 0) + 1);
    }

    const receipt = detectReceipt(text);
    if (receipt.hasUnverified) totals.unverified += 1;
    if (detectClaim(text).claim) {
      totals.claims += 1;
      if (receipt.hasReceipt) totals.claimsWithReceipt += 1;
    }
  }
}

const pct = (n, d) => (d === 0 ? '0.0' : ((n / d) * 100).toFixed(1));

if (asJson) {
  console.log(JSON.stringify({ root, ...totals, phrases: Object.fromEntries(phrases) }, null, 2));
} else if (totals.files === 0) {
  console.log(`no transcripts found under ${root}`);
} else {
  console.log(`scanned ${totals.messages} assistant messages in ${totals.files} transcripts`);
  console.log('');
  console.log(`${totals.openers} sycophantic openers (${pct(totals.openers, totals.messages)}% of messages)`);
  for (const [phrase, n] of [...phrases].sort((a, b) => b[1] - a[1]).slice(0, 8)) {
    console.log(`  ${String(n).padStart(5)}  "${phrase}"`);
  }
  console.log('');
  console.log(`${totals.claims} completion claims, ${totals.claimsWithReceipt} of them with a receipt `
    + `(${pct(totals.claimsWithReceipt, totals.claims)}%)`);
  console.log(`${totals.unverified} messages said "unverified:" outright`);
  console.log('');
  console.log('This counts wording, not truth: a claim without a receipt block here is not');
  console.log('proof the agent lied, only that the message did not show its work.');
}
