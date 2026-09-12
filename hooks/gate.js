#!/usr/bin/env node
// Stop and SubagentStop: no receipt, no "done".
//
// Reads the final assistant message, checks it against the session ledger,
// and hands the turn back to the model at most once (full) or twice (ultra)
// with a reason it can act on. Everything else is in lib/gate-core.js so it
// can be tested without spawning a process.
import fs from 'node:fs';
import { run } from './lib/io.js';
import { getMode, readSession, updateSession, bumpStats, debug } from './lib/state.js';
import { suggestCommand } from './lib/evidence.js';
import { detectOpener } from './lib/claims.js';
import { decide } from './lib/gate-core.js';
import { host } from './lib/host.js';

// Claude Code and Codex hand us the final text directly. Copilot's agentStop
// does not; it gives a transcript path. Take the last assistant entry from it
// if the file is JSONL we can read, otherwise there is nothing to gate.
function finalMessage(input) {
  if (typeof input.last_assistant_message === 'string') return input.last_assistant_message;
  const file = input.transcriptPath || input.transcript_path;
  if (!file) return '';
  try {
    const lines = fs.readFileSync(file, 'utf8').trim().split('\n');
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      let entry;
      try { entry = JSON.parse(lines[i]); } catch { continue; }
      const msg = entry?.message ?? entry;
      if (msg?.role !== 'assistant') continue;
      const c = msg.content;
      if (typeof c === 'string') return c;
      if (Array.isArray(c)) return c.filter((p) => p?.type === 'text').map((p) => p.text).join('\n');
    }
  } catch {
    // unreadable transcript, fail open
  }
  return '';
}

// One block budget per turn. prompt_id is new every turn on Claude Code; Codex
// calls it turn_id. Fall back to the session so the budget still exists.
const turnKey = (input) => String(input.prompt_id || input.turn_id || input.session_id || 'turn');

run('gate', (input) => {
  const mode = getMode();
  const event = /SubagentStop/i.test(String(input.hook_event_name)) ? 'SubagentStop' : 'Stop';
  const message = finalMessage(input);
  const id = input.session_id || input.sessionId;
  const session = readSession(id);
  const key = turnKey(input);
  const blocksSoFar = Number(session.blocks?.[key]) || 0;

  if (detectOpener(message).opener) {
    bumpStats({ openers: 1 });
    updateSession(id, (s) => ({ ...s, openers: s.openers + 1 }));
  }

  const suggested = suggestCommand(input.cwd || process.cwd());

  if (mode === 'lite') {
    // Count what full would have done; say nothing to the model.
    const dry = decide({ message, session, mode: 'full', blocksThisTurn: 0, suggested });
    if (dry.action === 'block') {
      bumpStats({ warned: 1 });
      debug('gate:lite', { kind: dry.kind });
    }
    return null;
  }

  const verdict = decide({
    message,
    session,
    mode,
    blocksThisTurn: blocksSoFar,
    // A subagent gets one block, whatever the mode. It cannot be trapped.
    stopHookActive: Boolean(input.stop_hook_active) || (event === 'SubagentStop' && blocksSoFar > 0),
    suggested,
  });

  if (verdict.action !== 'block') {
    debug('gate:allow', { kind: verdict.kind });
    return null;
  }

  updateSession(id, (s) => ({ ...s, blocks: { ...s.blocks, [key]: blocksSoFar + 1 } }));
  bumpStats({ blocks: 1, [`block_${verdict.kind.replace(/-/g, '_')}`]: 1 });

  // Claude Code renders decision:"block" as a hook error and additionalContext
  // as "Stop hook feedback". full uses the feedback form; ultra uses the error
  // form because the user asked for the loud one. Codex and Copilot only
  // document decision:"block", so they always get that.
  if (mode === 'ultra' || host !== 'claude') {
    return { decision: 'block', reason: verdict.reason };
  }
  return { hookSpecificOutput: { hookEventName: event, additionalContext: verdict.reason } };
});
