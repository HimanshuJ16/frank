#!/usr/bin/env node
// SubagentStart: subagents inherit nothing, so they get the short ruleset.
import { run } from './lib/io.js';
import { getMode } from './lib/state.js';
import { subagentRulesText, frameForInjection } from './lib/ruleset.js';

/** FRANK_SUBAGENT_MATCHER: unanchored, case-insensitive regex on agent type. */
function matchesAgent(agentType) {
  const pattern = process.env.FRANK_SUBAGENT_MATCHER;
  if (!pattern) return true;
  try {
    return new RegExp(pattern, 'i').test(String(agentType || ''));
  } catch {
    return true; // invalid regex: inject anyway
  }
}

run('subagent', (input) => {
  const mode = getMode();
  if (mode === 'off') return null;
  if (!matchesAgent(input.agent_type)) return null;

  const context = frameForInjection(subagentRulesText(), mode);
  if (!context) return null;

  return {
    hookSpecificOutput: { hookEventName: 'SubagentStart', additionalContext: context },
  };
});
