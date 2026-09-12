#!/usr/bin/env node
// CI gate: no adapter may drift from rules/frank.md. Exits 1 with the list.
import { TARGETS, render, rules, readTarget } from './adapters.js';

const body = rules();
const stale = [];

for (const target of Object.keys(TARGETS)) {
  const actual = readTarget(target);
  if (actual === null) {
    stale.push(`${target}: missing`);
  } else if (actual !== render(target, body)) {
    stale.push(`${target}: drifted from rules/frank.md`);
  }
}

if (stale.length) {
  console.error('Rule copies are out of date:');
  for (const line of stale) console.error(`  - ${line}`);
  console.error('\nFix: npm run build:adapters');
  process.exit(1);
}

console.log(`${Object.keys(TARGETS).length} adapters match rules/frank.md`);
