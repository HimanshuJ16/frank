#!/usr/bin/env node
// Prints the command that would produce a receipt in this repo, and what the
// session ledger has already recorded. Reads only; runs nothing.
import { suggestCommand } from '../hooks/lib/evidence.js';
import { readSession } from '../hooks/lib/state.js';

const cwd = process.argv[2] || process.cwd();
const sessionId = process.argv[3];

const suggestion = suggestCommand(cwd);
console.log(`repo: ${cwd}`);
console.log(`suggested verification: ${suggestion || 'none detected - ask the user what proves it'}`);

if (sessionId) {
  const session = readSession(sessionId);
  const after = (session.evidence || []).filter((e) => Number(e.ts) >= (session.lastEditTs || 0));
  console.log(`last edit: ${session.lastEditTs ? new Date(session.lastEditTs).toISOString() : 'none recorded'}`);
  if (after.length === 0) {
    console.log('verification since last edit: none');
  } else {
    console.log('verification since last edit:');
    for (const e of after) {
      console.log(`  ${new Date(e.ts).toISOString()}  exit ${e.exitCode}  ${e.cmd}`);
    }
  }
}
