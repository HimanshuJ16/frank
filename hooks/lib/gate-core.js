// The receipts gate, as a pure function. hooks/gate.js is the plumbing around it.
import { detectClaim, detectReceipt, detectOpener } from './claims.js';
import { evidenceAfter } from './evidence.js';
import { MAX_BLOCKS } from './state.js';

const allow = (why) => ({ action: 'allow', kind: why, reason: null });

function normalizeCmd(cmd) {
  return String(cmd || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Did anything in the ledger plausibly correspond to this cited command?
 * The ledger keeps the full command line cut to 500 characters and, separately,
 * the segment that made it count as verification. A long compound command can
 * push that segment past the cut, so both fields are checked.
 */
function ledgerHas(entries, cited) {
  const want = normalizeCmd(cited);
  if (!want) return false;
  const close = (got) => Boolean(got) && (got === want || got.includes(want) || want.includes(got));
  return entries.some((e) => close(normalizeCmd(e.cmd)) || close(normalizeCmd(e.matched)));
}

/**
 * @param {object} args
 * @param {string} args.message      last assistant message
 * @param {object} args.session      { lastEditTs, evidence[] }
 * @param {string} args.mode         off | lite | full | ultra
 * @param {number} args.blocksThisTurn
 * @param {boolean} args.stopHookActive
 * @param {string|null} args.suggested  command that would produce a receipt here
 * @returns {{action:'allow'|'block', kind:string, reason:string|null}}
 */
export function decide({
  message = '',
  session = { lastEditTs: 0, evidence: [] },
  mode = 'full',
  blocksThisTurn = 0,
  stopHookActive = false,
  suggested = null,
}) {
  if (mode === 'off') return allow('mode-off');
  if (stopHookActive) return allow('stop-hook-active');
  if (!message.trim()) return allow('empty-message');

  const maxBlocks = MAX_BLOCKS[mode] ?? 0;
  const canBlock = blocksThisTurn < maxBlocks;

  const opener = detectOpener(message);
  if (mode === 'ultra' && opener.opener && canBlock) {
    return {
      action: 'block',
      kind: 'opener',
      reason: `Frank: that message opens with "${opener.matched}". Rewrite it starting with the answer. `
        + 'If the user is right, say why they are right, not that they are.',
    };
  }

  const receipt = detectReceipt(message);
  if (receipt.hasUnverified) return allow('honest-unverified');

  const after = evidenceAfter(session, session.lastEditTs || 0);

  if (receipt.hasReceipt) {
    const unmatched = receipt.ran.filter((cmd) => !ledgerHas(after, cmd));
    if (unmatched.length === 0) return allow('receipt-matches-ledger');
    if (!canBlock) return allow('block-budget-spent');
    return {
      action: 'block',
      kind: 'receipt-not-run',
      reason: `Frank: the receipt cites \`${unmatched[0]}\`, which this session has no record of running `
        + 'after the last edit. Run it and quote the real output, or replace the receipt with '
        + '`unverified: <what would verify it>`.',
    };
  }

  const claim = detectClaim(message);
  if (!claim.claim) return allow('no-claim');

  if (after.length > 0) {
    const failing = after.filter((e) => Number(e.exitCode) !== 0);
    const passing = after.filter((e) => Number(e.exitCode) === 0);
    const lastFail = failing[failing.length - 1];
    const lastPass = passing[passing.length - 1];
    const contradicted = lastFail && (!lastPass || Number(lastPass.ts) < Number(lastFail.ts));
    if (contradicted) {
      if (!canBlock) return allow('block-budget-spent');
      return {
        action: 'block',
        kind: 'contradiction',
        reason: `Frank: the message claims "${claim.matched}" but the last verification, `
          + `\`${lastFail.cmd}\`, exited ${lastFail.exitCode}. Either fix it and re-run, or say `
          + 'what still fails.',
      };
    }
    return allow('evidence-present');
  }

  if (!canBlock) return allow('block-budget-spent');
  const hint = suggested ? `\`${suggested}\`` : 'the command that would prove it';
  return {
    action: 'block',
    kind: 'no-receipt',
    reason: `Frank: the message claims "${claim.matched}" and nothing ran after the last edit to `
      + `back it up. Run ${hint}, or the narrowest command that covers the change, and end with:\n`
      + '  ran: <command>\n  result: <real output>\n'
      + 'Or, if you are not going to run it, end with `unverified: <what would verify it>`.',
  };
}
