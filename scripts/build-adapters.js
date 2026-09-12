#!/usr/bin/env node
// Regenerates every host adapter from rules/frank.md.
import { TARGETS, render, rules, readTarget, writeTarget } from './adapters.js';

const body = rules();
let changed = 0;

for (const target of Object.keys(TARGETS)) {
  const next = render(target, body);
  if (readTarget(target) === next) continue;
  writeTarget(target, next);
  changed += 1;
  console.log(`wrote ${target}`);
}

console.log(changed === 0
  ? `up to date: ${Object.keys(TARGETS).length} adapters`
  : `regenerated ${changed} of ${Object.keys(TARGETS).length} adapters`);
