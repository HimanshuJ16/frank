// Which host is running the hook, and how it wants output shaped.
//
// Claude Code, Codex and Copilot CLI all read the same hooks file, but each
// tells us who it is a different way:
//   Codex     sets PLUGIN_DATA (and CLAUDE_PLUGIN_ROOT for compatibility)
//   Copilot   sets COPILOT_PLUGIN_DATA, except the VS Code flavour, which only
//             sets CLAUDE_PLUGIN_ROOT pointing under .vscode/agent-plugins
//   Qoder     sets QODER_SESSION_ID
//   otherwise it is Claude Code
export function detectHost(env = process.env) {
  const root = String(env.CLAUDE_PLUGIN_ROOT || '');
  const vscodeCopilot = root.split(/[\\/]+/).includes('agent-plugins') && /\.vscode/i.test(root);
  if (env.COPILOT_PLUGIN_DATA || vscodeCopilot) return 'copilot';
  if (env.PLUGIN_DATA) return 'codex';
  if (env.QODER_SESSION_ID) return 'qoder';
  return 'claude';
}

export const host = detectHost();

/**
 * Wrap a context string in the JSON the host expects for `event`.
 * Claude Code and Codex share the hookSpecificOutput shape; Codex also shows a
 * systemMessage as a badge, so the mode is visible in the UI. Copilot only
 * honours a top-level additionalContext on sessionStart and ignores the rest.
 */
export function contextOutput(event, mode, context) {
  if (!context) return null;
  if (host === 'copilot') {
    return event === 'SessionStart' ? { additionalContext: context } : null;
  }
  const out = {
    hookSpecificOutput: { hookEventName: event, additionalContext: context },
  };
  if (host === 'codex') out.systemMessage = `FRANK:${mode.toUpperCase()}`;
  return out;
}
