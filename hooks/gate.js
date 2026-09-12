#!/usr/bin/env node
// Stop / SubagentStop: no receipt, no "done".
import { run } from './lib/io.js';
import { getMode, readSession, updateSession, bumpStats, debug } from './lib/state.js';
import { suggestCommand } from './lib/evidence.js';
import { detectOpener } from './lib/claims.js';
import { decide } from './lib/gate-core.js';

/** One budget per turn. prompt_id changes every turn; fall back to the session. */
const turnKey = (input) => String(input.prompt_id || input.session_id || 'turn');

run('gate', (input) => {
  const mode = getMode();
  const event = input.hook_event_name === 'SubagentStop' ? 'SubagentStop' : 'Stop';
  const message = String(input.last_assistant_message || '');
  const sessionId = input.session_id;
  const session = readSession(sessionId);
  const key = turnKey(input);

  const opener = detectOpener(message);
  if (opener.opener) {
    bumpStats({ openers: 1 });
    updateSession(sessionId, (s) => ({ ...s, openers: s.openers + 1 }));
  }

  if (mode === 'lite') {
    // Report, never interrupt.
    const preview = decide({ message, session, mode: 'full', blocksThisTurn: 0,
      stopHookActive: false, suggested: suggestCommand(input.cwd || process.cwd()) });
    if (preview.action === 'block') {
      bumpStats({ warned: 1 });
      debug('gate:lite-warn', { kind: preview.kind });
      process.stderr.write(`Frank (lite): ${preview.kind}\n`);
    }
    return null;
  }

  const verdict = decide({
    message,
    session,
    mode,
    blocksThisTurn: Number(session.blocks?.[key]) || 0,
    // SubagentStop gets one block, so the subagent can't be trapped in a loop.
    stopHookActive: Boolean(input.stop_hook_active)
      || (event === 'SubagentStop' && Number(session.blocks?.[key]) > 0),
    suggested: suggestCommand(input.cwd || process.cwd()),
  });

  if (verdict.action !== 'block') {
    debug('gate:allow', { kind: verdict.kind });
    return null;
  }

  updateSession(sessionId, (s) => ({
    ...s,
    blocks: { ...s.blocks, [key]: (Number(s.blocks?.[key]) || 0) + 1 },
  }));
  bumpStats({ blocks: 1, [`block_${verdict.kind.replace(/-/g, '_')}`]: 1 });

  // full: "Stop hook feedback" (continues the turn, no error banner).
  // ultra: a hook error the model cannot read past.
  if (mode === 'ultra') {
    return { decision: 'block', reason: verdict.reason };
  }
  return {
    hookSpecificOutput: { hookEventName: event, additionalContext: verdict.reason },
  };
});
