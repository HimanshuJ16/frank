# Hook behavior, as verified

**Source:** <https://code.claude.com/docs/en/hooks> (the `.md` sibling of that URL is the
full reference; the HTML page truncates in fetchers).
**Verified:** 2026-09-12. **Claude Code version referenced by the docs:** 2.1.2xx series.

Re-read this page before changing a hook. The API moves; §8 of `FRANK.md` was written
from an earlier shape of it and four details did not survive contact.

---

## What Frank registers

`hooks/hooks.json`, loaded through `.claude-plugin/plugin.json` → `"hooks": "./hooks/hooks.json"`.

| Event | Matcher | Script | Why |
|---|---|---|---|
| `SessionStart` | — | `inject.js` | Ruleset into context before the first prompt; mode banner. |
| `UserPromptSubmit` | — | `inject.js` | Re-inject every turn so the rules survive a long session; also parses `/frank <mode>`. |
| `SubagentStart` | — | `subagent.js` | Subagents inherit no context. They get the short ruleset. |
| `PostToolUse` | `Bash\|PowerShell` | `ledger.js` | Record verification commands that succeeded. |
| `PostToolUse` | `Edit\|Write\|MultiEdit\|NotebookEdit` | `ledger.js` | Record when the last change happened. |
| `PostToolUseFailure` | `Bash\|PowerShell` | `ledger.js` | Record verification commands that failed, with the exit code. |
| `Stop` | — | `gate.js` | The receipts gate. |
| `SubagentStop` | — | `gate.js` | Same gate on the subagent's final message, one block. |

All eight entries use **exec form** — `"command": "node", "args": ["${CLAUDE_PLUGIN_ROOT}/hooks/x.js"]`.
Shell form would re-tokenize the path, which breaks on Windows paths with spaces. The docs
recommend exec form for exactly this, and note that `.cmd`/`.bat` shims cannot be spawned
in exec form on Windows — `node` plus a script path works everywhere.

---

## The four corrections to FRANK.md §8–9

### 1. The gate does not parse the transcript

`Stop` and `SubagentStop` receive **`last_assistant_message`**: the text of the final
response. The docs state plainly that `transcript_path` "is written asynchronously and
may lag the in-memory conversation" and that hooks needing the final assistant text
"should use `last_assistant_message` … instead of reading the transcript". So `gate.js`
never opens the transcript at all.

### 2. Subagent injection uses `SubagentStart`, not `PreToolUse`

`SubagentStart` fires when a subagent is spawned, filters on `agent_type`, and accepts
`hookSpecificOutput.additionalContext`, which lands "at the start of the conversation,
before its first prompt". It also survives re-runs sensibly: Claude Code skips injection
when the subagent already holds the copy, and re-injects after the subagent
auto-compacts. A `PreToolUse` hook on the `Agent` tool would have had to mutate
`updatedInput`, which is both fragile and wrong for resumed subagents.

### 3. Blocking has two flavours, and the gentler one is the right default

For `Stop`/`SubagentStop`:

| Mechanism | Effect |
|---|---|
| `{"decision": "block", "reason": "..."}` | Turn continues, `reason` becomes Claude's next instruction. Rendered as a **hook error**. |
| `{"hookSpecificOutput": {"hookEventName": "Stop", "additionalContext": "..."}}` | Turn continues, text delivered to Claude. Rendered as **"Stop hook feedback"**, no error notice. |
| `exit 2` with stderr | Same routing as `reason`. |

Both go through the same loop protection. The docs recommend `additionalContext` for a
hook "working as designed and giving Claude guidance, such as 'run the test suite before
finishing'" — which is precisely the receipts gate. So:

- `full` → `additionalContext`. Frank asking for a receipt is not an error.
- `ultra` → `decision: "block"`. The user asked for the louder one.

### 4. `PreCompact` cannot inject context

`PreCompact` has no `additionalContext`; it can only block compaction. `PostCompact`
has no decision control at all. The ruleset survives compaction a different way:
**`SessionStart` fires again with `source: "compact"`**. `inject.js` handles that source
and skips the mode banner so the user doesn't see a second announcement.

---

## Loop protection

- `Stop`/`SubagentStop` stdin carries **`stop_hook_active: true`** when the turn is
  already continuing because of a stop hook. `gate.js` returns immediately when it is set.
- Claude Code independently "overrides the hook and ends the turn after 8 consecutive
  blocks".
- Frank adds its own budget on top: 0 blocks in `off`/`lite`, 1 in `full`, 2 in `ultra`,
  counted per turn under `prompt_id` in the session ledger.

Three independent brakes, because a gate that can trap the user is worse than no gate.

## Exit codes

Exit 0 on every path. The decision is carried in the JSON on stdout, never in the code.
Exit 2 is reserved for policy hooks that must block; Frank never needs it, because
`additionalContext` already continues the turn. Note the trap the docs call out: **exit 1
does not block** — a hook that crashes with a conventional failure code is a non-blocking
error, which is exactly the fail-open behaviour we want anyway.

## Injected text is phrased as configuration, not as orders

The docs warn: "Text framed as out-of-band system commands can trigger Claude's
prompt-injection defenses, which causes Claude to surface the text to you instead of
treating it as context." The ruleset is imperative by nature, so `hooks/lib/ruleset.js`
wraps it in a factual frame — *the user has installed the Frank behavior package; these
are the rules the user configured* — before injecting.

## Debugging

`FRANK_DEBUG=1` writes one JSON line per hook invocation to
`<frank home>/log.jsonl`. Claude Code's own hook log: `CLAUDE_DEBUG=1 claude`, output in
`~/.claude/logs/`. A hook whose path is wrong shows
`Failed with non-blocking status code:` on its first run — watch for that after install.

## Codex

Not yet verified. `hooks/codex-hooks.json` ships in Phase 3, and this document gets a
Codex section written the same way: from the current docs, dated, before any code.
