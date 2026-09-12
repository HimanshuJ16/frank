#!/usr/bin/env node
// PostToolUse / PostToolUseFailure: record what actually ran, so the gate can tell
// a receipt from a story. Records commands; never runs them.
import { run } from './lib/io.js';
import { getMode, getConfig, updateSession } from './lib/state.js';
import { classifyCommand } from './lib/evidence.js';

const EDIT_TOOLS = /^(?:Edit|Write|MultiEdit|NotebookEdit)$/;
const SHELL_TOOLS = /^(?:Bash|PowerShell)$/;

/** Bash failures arrive as a string whose first line is "Exit code N". */
function exitCodeFrom(input) {
  if (input.hook_event_name !== 'PostToolUseFailure') return 0;
  const m = /exit code (\d+)/i.exec(String(input.error || ''));
  return m ? Number(m[1]) : 1;
}

function tail(input, limit = 400) {
  const source = input.hook_event_name === 'PostToolUseFailure'
    ? String(input.error || '')
    : String(input.tool_response?.stdout ?? input.tool_response?.stderr ?? '');
  return source.trim().slice(-limit);
}

run('ledger', (input) => {
  if (getMode() === 'off') return null;
  const tool = String(input.tool_name || '');
  const sessionId = input.session_id;

  if (EDIT_TOOLS.test(tool)) {
    updateSession(sessionId, (s) => ({ ...s, lastEditTs: Date.now() }));
    return null;
  }

  if (!SHELL_TOOLS.test(tool)) return null;
  const command = String(input.tool_input?.command || '');
  const { isEvidence, category, matched } = classifyCommand(
    command,
    getConfig()?.receipts?.commands,
  );
  if (!isEvidence) return null;

  updateSession(sessionId, (s) => ({
    ...s,
    evidence: [...s.evidence, {
      ts: Date.now(),
      cmd: command.trim().slice(0, 500),
      matched,
      category,
      exitCode: exitCodeFrom(input),
      tail: tail(input),
    }],
  }));
  return null;
});
