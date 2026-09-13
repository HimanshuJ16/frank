import test from 'node:test';
import assert from 'node:assert/strict';
import { decide } from '../hooks/lib/gate-core.js';

const CLAIM = 'Fixed the retry loop.';
const session = (over = {}) => ({ lastEditTs: 100, evidence: [], ...over });
const ev = (over = {}) => ({ ts: 200, cmd: 'npm test', exitCode: 0, category: 'test', ...over });

test('mode off never blocks', () => {
  const r = decide({ message: CLAIM, session: session(), mode: 'off' });
  assert.equal(r.action, 'allow');
  assert.equal(r.kind, 'mode-off');
});

test('lite has no block budget', () => {
  assert.equal(decide({ message: CLAIM, session: session(), mode: 'lite' }).action, 'allow');
});

test('never blocks twice in a row on the same continuation', () => {
  const r = decide({ message: CLAIM, session: session(), mode: 'full', stopHookActive: true });
  assert.equal(r.action, 'allow');
  assert.equal(r.kind, 'stop-hook-active');
});

test('an empty final message is not a claim', () => {
  assert.equal(decide({ message: '   ', session: session(), mode: 'full' }).action, 'allow');
});

test('prose with no claim passes', () => {
  const msg = 'The backoff is unbounded at line 41. Capping it needs a config read.';
  assert.equal(decide({ message: msg, session: session(), mode: 'full' }).action, 'allow');
});

test('claim with nothing run is blocked', () => {
  const r = decide({ message: CLAIM, session: session(), mode: 'full', suggested: 'npm test' });
  assert.equal(r.action, 'block');
  assert.equal(r.kind, 'no-receipt');
  assert.match(r.reason, /npm test/);
  assert.match(r.reason, /unverified:/);
});

test('the block reason degrades gracefully with no suggestion', () => {
  const r = decide({ message: CLAIM, session: session(), mode: 'full', suggested: null });
  assert.equal(r.action, 'block');
  assert.match(r.reason, /command that would prove it/);
});

test('claim with a passing run after the edit passes', () => {
  const r = decide({
    message: CLAIM, session: session({ evidence: [ev()] }), mode: 'full',
  });
  assert.equal(r.action, 'allow');
  assert.equal(r.kind, 'evidence-present');
});

test('a run from before the last edit does not count', () => {
  const r = decide({
    message: CLAIM, session: session({ evidence: [ev({ ts: 50 })] }), mode: 'full',
  });
  assert.equal(r.action, 'block');
  assert.equal(r.kind, 'no-receipt');
});

test('claim contradicted by a failing run is blocked', () => {
  const r = decide({
    message: CLAIM, session: session({ evidence: [ev({ exitCode: 1 })] }), mode: 'full',
  });
  assert.equal(r.action, 'block');
  assert.equal(r.kind, 'contradiction');
  assert.match(r.reason, /exited 1/);
});

test('a failing run followed by a passing one is not a contradiction', () => {
  const r = decide({
    message: CLAIM,
    session: session({ evidence: [ev({ ts: 200, exitCode: 1 }), ev({ ts: 300, exitCode: 0 })] }),
    mode: 'full',
  });
  assert.equal(r.action, 'allow');
});

test('"unverified:" always gets through', () => {
  const msg = `${CLAIM}\n\nunverified: no test covers the retry path`;
  const r = decide({ message: msg, session: session(), mode: 'full' });
  assert.equal(r.action, 'allow');
  assert.equal(r.kind, 'honest-unverified');
});

test('a receipt backed by the ledger passes', () => {
  const msg = `${CLAIM}\n\nran: npm test\nresult: 42 passed, 0 failed`;
  const r = decide({ message: msg, session: session({ evidence: [ev()] }), mode: 'full' });
  assert.equal(r.action, 'allow');
  assert.equal(r.kind, 'receipt-matches-ledger');
});

test('a receipt citing a command that never ran is blocked', () => {
  const msg = `${CLAIM}\n\nran: pytest -q\nresult: 118 passed`;
  const r = decide({ message: msg, session: session({ evidence: [ev()] }), mode: 'full' });
  assert.equal(r.action, 'block');
  assert.equal(r.kind, 'receipt-not-run');
  assert.match(r.reason, /pytest -q/);
});

test('receipt matching tolerates extra flags in the ledger entry', () => {
  const msg = `${CLAIM}\n\nran: npm test\nresult: ok`;
  const r = decide({
    message: msg,
    session: session({ evidence: [ev({ cmd: 'npm test -- --runInBand' })] }),
    mode: 'full',
  });
  assert.equal(r.action, 'allow');
});

test('the block budget is spent after maxBlocks', () => {
  const r = decide({ message: CLAIM, session: session(), mode: 'full', blocksThisTurn: 1 });
  assert.equal(r.action, 'allow');
  assert.equal(r.kind, 'block-budget-spent');
});

test('ultra allows a second block in the same turn', () => {
  const r = decide({ message: CLAIM, session: session(), mode: 'ultra', blocksThisTurn: 1 });
  assert.equal(r.action, 'block');
  assert.equal(decide({
    message: CLAIM, session: session(), mode: 'ultra', blocksThisTurn: 2,
  }).action, 'allow');
});

test('ultra blocks a sycophantic opener', () => {
  const r = decide({
    message: "You're absolutely right! Fixed it.", session: session(), mode: 'ultra',
  });
  assert.equal(r.action, 'block');
  assert.equal(r.kind, 'opener');
  assert.match(r.reason, /absolutely right/);
});

test('full does not block on an opener alone', () => {
  const r = decide({
    message: "You're absolutely right, the cap is missing.", session: session(), mode: 'full',
  });
  assert.equal(r.action, 'allow');
});

test('missing session state does not throw', () => {
  const r = decide({ message: CLAIM, mode: 'full' });
  assert.equal(r.action, 'block');
});

test('a receipt matches a command that the 500-character cut pushed out of the stored line', () => {
  // The ledger keeps the command line truncated and the matched segment
  // separately. A long compound command can carry the verification past the
  // cut; the receipt must still match on the segment.
  const long = `${'echo padding && '.repeat(40)}npm run check 2>&1 | tail -5`;
  const stored = long.slice(0, 500);
  assert.ok(!stored.includes('npm run check'), 'fixture must truncate past the verification');
  const s = session({ evidence: [ev({ cmd: stored, matched: 'npm run check 2>&1', category: 'build' })] });
  const r = decide({ message: 'Rebuilt.\nran: npm run check\nresult: 278 passed', session: s, mode: 'full' });
  assert.equal(r.action, 'allow');
  assert.equal(r.kind, 'receipt-matches-ledger');
});
