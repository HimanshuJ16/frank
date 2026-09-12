#!/usr/bin/env node
// SessionStart + UserPromptSubmit: keep the ruleset in context at the current mode.
import { run } from './lib/io.js';
import { getMode, setMode, normalizeMode, pruneSessions } from './lib/state.js';
import { rulesText, frameForInjection } from './lib/ruleset.js';

const MODE_COMMAND = /^\s*\/frank(?:\s+(\S+))?\s*$/i;

run('inject', (input) => {
  const event = input.hook_event_name === 'SessionStart' ? 'SessionStart' : 'UserPromptSubmit';
  let mode = getMode();

  // Fallback for hosts that don't route /frank to the skill.
  if (event === 'UserPromptSubmit') {
    const match = MODE_COMMAND.exec(input.prompt || '');
    const requested = match && normalizeMode(match[1]);
    if (requested) mode = setMode(requested) || mode;
  }

  if (event === 'SessionStart') pruneSessions();
  if (mode === 'off') return null;

  const context = frameForInjection(rulesText(), mode);
  if (!context) return null;

  const payload = {
    hookSpecificOutput: { hookEventName: event, additionalContext: context },
  };
  if (event === 'SessionStart' && input.source !== 'compact') {
    payload.systemMessage = `Frank: ${mode}`;
  }
  return payload;
});
