#!/usr/bin/env node
// `node scripts/mode.js`               report the mode and where it comes from
// `node scripts/mode.js ultra`         switch, until `default` or another switch
// `node scripts/mode.js default`       drop the switch; the configured default applies
import { resolveMode, setMode, clearMode, normalizeMode, MODES } from '../hooks/lib/state.js';
import { STATE_FILE } from '../hooks/lib/paths.js';

const BLURB = {
  off: 'nothing injected, gate silent',
  lite: 'rules injected, receipts gate reports but never interrupts',
  full: 'rules injected, gate asks once for a receipt',
  ultra: 'gate asks twice and blocks sycophantic openers',
};

function report(prefix = 'mode') {
  const { mode, source } = resolveMode();
  console.log(`${prefix}: ${mode} (${BLURB[mode]}; from ${source})`);
  if (process.env.FRANK_MODE) console.log(`note: FRANK_MODE=${process.env.FRANK_MODE} overrides everything in this process.`);
}

const arg = String(process.argv[2] || '').trim().toLowerCase();

if (!arg) {
  report();
  process.exit(0);
}

if (arg === 'default') {
  if (!clearMode()) {
    console.error(`could not write ${STATE_FILE()}; mode unchanged`);
    process.exit(1);
  }
  report('mode');
  process.exit(0);
}

const wanted = normalizeMode(arg);
if (!wanted) {
  console.error(`unknown mode: ${arg}. one of: ${MODES.join(' | ')} | default`);
  process.exit(1);
}
if (!setMode(wanted)) {
  console.error(`could not write ${STATE_FILE()}; mode unchanged`);
  process.exit(1);
}
report('mode');
