#!/usr/bin/env node
// SessionStart and UserPromptSubmit: keep the ruleset in front of the model.
//
// SessionStart context is parent-thread only and does not survive compaction,
// so the same hook runs on every prompt too. It also handles `/frank <mode>`
// for hosts that do not route slash commands to the skill.
import { run } from './lib/io.js';
import { getMode, setMode, clearMode, normalizeMode, pruneSessions } from './lib/state.js';
import { rulesText, frameForInjection } from './lib/ruleset.js';
import { host, contextOutput } from './lib/host.js';

// /frank, @frank (Codex skill syntax), /frank:frank (Copilot namespacing)
const MODE_COMMAND = /^\s*[/@$]frank(?::frank)?(?:\s+(\S+))?\s*$/i;

run('inject', (input) => {
  const event = input.hook_event_name === 'SessionStart' ? 'SessionStart' : 'UserPromptSubmit';
  let mode = getMode();
  let switched = false;

  if (event === 'UserPromptSubmit') {
    const match = MODE_COMMAND.exec(input.prompt || '');
    const arg = match ? String(match[1] || '').toLowerCase() : '';
    if (arg === 'default') {
      // Back to the configured setting: drop the /frank switch.
      clearMode();
      const next = getMode();
      switched = next !== mode;
      mode = next;
    } else {
      const requested = normalizeMode(arg);
      if (requested && requested !== mode) {
        mode = setMode(requested) || mode;
        switched = mode === requested;
      }
    }
  }

  if (event === 'SessionStart') pruneSessions();

  if (mode === 'off') {
    // Codex shows the badge even when off, so the user can see it took.
    return switched && host === 'codex' ? { systemMessage: 'FRANK:OFF' } : null;
  }

  const context = frameForInjection(rulesText(), mode);
  const out = contextOutput(event, mode, context);
  if (!out) return null;

  // One banner per session. Not after compaction, which would read as a
  // second announcement, and never under Codex, which already shows the badge.
  const announce = event === 'SessionStart' && input.source !== 'compact';
  if (host === 'claude' && (announce || switched)) {
    out.systemMessage = `Frank: ${mode}`;
  }
  return out;
});
