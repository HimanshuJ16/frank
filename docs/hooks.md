# Hook behavior, as verified

Re-read the relevant section before changing a hook. The APIs move, and the hook design
this package started from was written against an earlier shape of them. Each host below
records the source and the date it was checked.

## Claude Code

**Source:** https://code.claude.com/docs/en/hooks (the `.md` sibling of that URL is the
full reference; the HTML page truncates in fetchers). **Checked:** 2026-09-12, Claude
Code 2.1.268.

### What Frank registers

`hooks/claude-codex-hooks.json`, loaded through `.claude-plugin/plugin.json`.

| Event | Matcher | Script | Why |
|---|---|---|---|
| `SessionStart` | `startup\|resume\|clear\|compact` | `inject.js` | Rules into context before the first prompt; mode banner. |
| `UserPromptSubmit` | | `inject.js` | Re-inject every turn so the rules survive a long session; parse `/frank <mode>`. About 490 tokens per prompt; a cheaper cadence is proposed and unmeasured in ADR-028. |
| `SubagentStart` | | `subagent.js` | Subagents start empty. They get the short ruleset. |
| `PostToolUse` | `Bash\|PowerShell\|Edit\|Write\|MultiEdit\|NotebookEdit\|apply_patch` | `ledger.js` | Record edits and verification commands that succeeded. |
| `PostToolUseFailure` | `Bash\|PowerShell` | `ledger.js` | Record verification commands that failed, with the exit code. |
| `Stop` | | `gate.js` | The receipts gate. |
| `SubagentStop` | | `gate.js` | Same gate on the subagent's final message, one block. |

Every entry is shell form, `node "${CLAUDE_PLUGIN_ROOT}/hooks/x.js"`, with the path
quoted because Windows install paths contain spaces. Exec form (`command` plus `args`)
would be cleaner on Claude Code, but Codex reads the same file and only understands shell
form. On Windows without Git Bash, Claude Code runs shell-form hooks through PowerShell.

### Four things that differ from the brief

**The gate does not parse the transcript.** `Stop` and `SubagentStop` carry
`last_assistant_message`. The docs say `transcript_path` "may lag the in-memory
conversation" and that hooks needing the final text "should use `last_assistant_message`
instead of reading the transcript". `gate.js` never opens the transcript on Claude Code.

**Subagents are reached through `SubagentStart`, not `PreToolUse(Task)`.** It fires when a
subagent is spawned, filters on `agent_type`, and accepts
`hookSpecificOutput.additionalContext`, which lands before the subagent's first prompt.
It also skips re-injection when the subagent already holds the copy and re-injects after
the subagent auto-compacts.

**Blocking has two flavours.** For `Stop` and `SubagentStop`:

| Output | Effect |
|---|---|
| `{"decision": "block", "reason": "..."}` | Turn continues, `reason` becomes the next instruction. Shown as a hook error. |
| `{"hookSpecificOutput": {"hookEventName": "Stop", "additionalContext": "..."}}` | Turn continues, text delivered. Shown as "Stop hook feedback", no error notice. |
| exit 2 with stderr | Same routing as `reason`. |

The docs recommend `additionalContext` for a hook "working as designed and giving Claude
guidance, such as 'run the test suite before finishing'". That is the receipts gate. So
`full` uses `additionalContext` and `ultra` uses `decision: "block"`.

**`PreCompact` cannot inject context.** It can only block compaction. The rules survive
compaction because `SessionStart` fires again with `source: "compact"`; `inject.js`
handles that source and skips the banner.

### Exit codes and stdin

Exit 0 on every path; the decision travels in JSON. Exit 2 blocks regardless of stdout and
Frank never needs it. Exit 1 is documented as non-blocking, so even an uncaught crash
fails open.

Stdin is read asynchronously with a one second grace period. A synchronous read can hang
when the PowerShell wrapper swallows the piped JSON and `end` never fires (ponytail's
issue #443). After the grace period the hook proceeds with whatever arrived, usually
nothing, and stays quiet.

### Loop protection

Three independent brakes: `stop_hook_active: true` in the `Stop` input returns
immediately; Claude Code itself ends the turn after 8 consecutive continuations; Frank
counts blocks per turn under `prompt_id` and stops at 1 (`full`) or 2 (`ultra`).

### Injected text is phrased as configuration

The docs warn that "text framed as out-of-band system commands can trigger Claude's
prompt-injection defenses, which causes Claude to surface the text to you instead of
treating it as context." The rules are imperative by nature, so `hooks/lib/ruleset.js`
wraps them in a statement of what the user installed and configured.

### Exit code for a failed command

The `Bash` tool response has `stdout`, `stderr`, `interrupted` and `isImage`, no exit
status, and `PostToolUse` only fires on success. Failures arrive at `PostToolUseFailure`
with an `error` string whose first line is `Exit code N`. That is what makes the
contradiction check ("claim says fixed; `pytest` exited 1") possible.

## Codex

**Source:** https://learn.chatgpt.com/docs/hooks (the old developers.openai.com URL
redirects there). **Checked:** 2026-09-12.

Events: `SessionStart`, `SessionEnd`, `PreToolUse`, `PermissionRequest`, `PostToolUse`,
`PreCompact`, `PostCompact`, `UserPromptSubmit`, `SubagentStart`, `SubagentStop`, `Stop`,
`Interrupt`. Same names as Claude Code for everything Frank uses, so one hooks file
serves both.

Differences that matter:

- Plugin hooks get `PLUGIN_ROOT` and `PLUGIN_DATA`, plus `CLAUDE_PLUGIN_ROOT` and
  `CLAUDE_PLUGIN_DATA` for compatibility. `hooks/lib/host.js` detects Codex from
  `PLUGIN_DATA`.
- The `command` field is a shell string only. No `args` array.
- `Stop` and `SubagentStop` carry `stop_hook_active` and `last_assistant_message`, and
  block with `{"decision": "block", "reason": "..."}`. The `additionalContext` form is not
  documented for Stop, so the gate always uses `decision` under Codex.
- There is no `PostToolUseFailure`. `PostToolUse` "also runs after commands that exit with
  a non-zero status" and the status lives in `tool_response`. The docs do not name the
  field; `ledger.js` checks `exit_code`, `exitCode`, `status` and `code` and treats none
  found as success.
- The shell tool is `Bash`; file edits are `apply_patch` (the matcher also accepts `Edit`
  and `Write`).
- `systemMessage` is shown in the UI, which is where the `FRANK:FULL` badge comes from.
- Users must review and trust each hook in `/hooks` before it runs. The README says so.

## GitHub Copilot CLI

**Source:** https://docs.github.com/en/copilot/reference/hooks-reference.
**Checked:** 2026-09-12.

`hooks/copilot-hooks.json` uses Copilot's own schema: `version: 1`, camelCase events,
`bash` and `powershell` command strings, `timeoutSec`.

- `sessionStart` accepts a top-level `additionalContext`. `userPromptSubmitted` does not
  (its only output is `modifiedPrompt`, honored by SDK hooks only), so the rules are
  injected once per session and the prompt hook only tracks `/frank <mode>`.
- `postToolUse` fires on success and failure and accepts `additionalContext`.
- `agentStop` blocks with `{"decision": "block", "reason": "..."}`, but its input has no
  final message, only `transcriptPath`. `gate.js` reads the last assistant entry from that
  file if it is JSONL it can parse, and stays quiet otherwise. Partial support, and
  labelled that way in the portability table.
- The VS Code flavour of Copilot sets no `COPILOT_PLUGIN_DATA`; it only sets
  `CLAUDE_PLUGIN_ROOT` pointing under `.vscode/agent-plugins`. `host.js` checks for that
  path shape.
- `hooks/copilot-hooks.json` references the plugin directory as `${PLUGIN_ROOT}`. That
  name is not in the hooks reference page and has not been verified against a live
  Copilot CLI install; the README labels the Copilot gate best-effort for this reason too.

## OpenCode

**Source:** https://opencode.ai/docs/plugins/ and ponytail's working plugin.
**Checked:** 2026-09-12.

The plugin hooks are `experimental.chat.system.transform` (append to the system prompt
each turn) and `command.execute.before` (persist `/frank <mode>`). Nothing in the plugin
API hands back the final assistant text with a way to continue the turn, so the receipts
gate does not run on OpenCode. Rules and commands do.

## Gemini CLI

Gemini auto-loads `hooks/hooks.json` from an extension root. Frank's hooks use Claude and
Codex event names, so that path must never exist; `tests/adapters-hosts.test.js` fails if
it does. Gemini gets the rules through `contextFileName: AGENTS.md` and the commands
through `commands/*.toml`.

## Debugging

`FRANK_DEBUG=1` writes one JSON line per hook invocation to `<frank home>/log.jsonl`.
Claude Code's own hook log: `CLAUDE_DEBUG=1 claude`, output under `~/.claude/logs/`. A
hook whose path is wrong shows `Failed with non-blocking status code:` on its first run.
