#!/usr/bin/env node
// PostToolUse and PostToolUseFailure: write down what actually ran.
//
// Two facts go in the ledger. When a file was last edited, and every shell
// command since that looked like verification, with its exit code. The gate
// reads it at Stop time. The ledger records commands; it never runs them.
import { run } from './lib/io.js';
import { getMode, getConfig, updateSession } from './lib/state.js';
import { classifyCommand } from './lib/evidence.js';

// apply_patch is Codex's edit tool. NotebookEdit is Claude's.
const EDIT_TOOLS = /^(?:Edit|Write|MultiEdit|NotebookEdit|apply_patch)$/;
const SHELL_TOOLS = /^(?:Bash|PowerShell)$/;

// Claude Code reports a failed Bash command through PostToolUseFailure with an
// `error` string whose first line is "Exit code N". Codex has no failure event:
// PostToolUse fires on non-zero too and the status lives somewhere in
// tool_response. The docs do not pin the field name, so look at the usual
// suspects and treat "nothing found" as success.
function exitCodeOf(input) {
  if (input.hook_event_name === 'PostToolUseFailure') {
    const m = /exit code (\d+)/i.exec(String(input.error || ''));
    return m ? Number(m[1]) : 1;
  }
  const r = input.tool_response;
  if (!r || typeof r !== 'object') return 0;
  for (const key of ['exit_code', 'exitCode', 'status', 'code']) {
    if (Number.isInteger(r[key])) return r[key];
    if (r.metadata && Number.isInteger(r.metadata[key])) return r.metadata[key];
  }
  return 0;
}

function tailOf(input, limit = 400) {
  const r = input.tool_response;
  const text = input.hook_event_name === 'PostToolUseFailure'
    ? String(input.error || '')
    : typeof r === 'string' ? r : String(r?.stdout ?? r?.output ?? r?.stderr ?? '');
  return text.trim().slice(-limit);
}

run('ledger', (input) => {
  if (getMode() === 'off') return null;
  const tool = String(input.tool_name || '');
  const id = input.session_id;

  if (EDIT_TOOLS.test(tool)) {
    updateSession(id, (s) => ({ ...s, lastEditTs: Date.now() }));
    return null;
  }
  if (!SHELL_TOOLS.test(tool)) return null;

  const command = String(input.tool_input?.command || '');
  const hit = classifyCommand(command, getConfig()?.receipts?.commands);
  if (!hit.isEvidence) return null;

  updateSession(id, (s) => ({
    ...s,
    evidence: [...s.evidence, {
      ts: Date.now(),
      cmd: command.trim().slice(0, 500),
      matched: hit.matched,
      category: hit.category,
      exitCode: exitCodeOf(input),
      tail: tailOf(input),
    }],
  }));
  return null;
});
