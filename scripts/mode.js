#!/usr/bin/env node
// `node scripts/mode.js [lite|full|ultra|off]` - read or set Frank's intensity.
import { getMode, setMode, normalizeMode, MODES } from '../hooks/lib/state.js';
import { STATE_FILE } from '../hooks/lib/paths.js';

const arg = process.argv[2];

if (!arg) {
  console.log(`mode: ${getMode()}`);
  process.exit(0);
}

const wanted = normalizeMode(arg);
if (!wanted) {
  console.error(`unknown mode: ${arg}. one of: ${MODES.join(' | ')}`);
  process.exit(1);
}

const applied = setMode(wanted);
if (!applied) {
  console.error(`could not write ${STATE_FILE()}; mode unchanged (still ${getMode()})`);
  process.exit(1);
}

const blurb = {
  off: 'nothing injected, gate silent',
  lite: 'ruleset injected, receipts gate reports but never interrupts',
  full: 'ruleset injected, gate asks once for a receipt',
  ultra: 'gate asks twice and blocks sycophantic openers',
};

console.log(`mode: ${applied} (${blurb[applied]})`);
if (process.env.FRANK_MODE) {
  console.log(`note: FRANK_MODE=${process.env.FRANK_MODE} is set and overrides this.`);
}
