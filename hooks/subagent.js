#!/usr/bin/env node
// SubagentStart: a subagent starts with an empty context, so the rules the
// parent got at SessionStart never reach it. Give it the short version.
//
// FRANK_SUBAGENT_MATCHER scopes this to agent types matching a regex
// (unanchored, case-insensitive). Unset means every subagent. A regex that
// does not compile, or a host that reports no agent_type, injects anyway:
// the failure mode of scoping is a silent drop, and silence is what we are
// trying to remove.
import { run } from './lib/io.js';
import { getMode } from './lib/state.js';
import { subagentRulesText, frameForInjection } from './lib/ruleset.js';
import { contextOutput } from './lib/host.js';

function matches(agentType) {
  const pattern = process.env.FRANK_SUBAGENT_MATCHER;
  if (!pattern || !agentType) return true;
  try {
    return new RegExp(pattern, 'i').test(String(agentType));
  } catch {
    return true;
  }
}

run('subagent', (input) => {
  const mode = getMode();
  if (mode === 'off') return null;
  if (!matches(input.agent_type)) return null;
  return contextOutput('SubagentStart', mode, frameForInjection(subagentRulesText(), mode));
});
