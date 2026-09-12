# Decisions

ADRs, newest last. A decision that turned out wrong gets a follow-up ADR, not an edit.

## ADR-000: The name is Frank

**2026-09-12. Accepted.**

Checked today:

| Surface | Result |
|---|---|
| npm `frank` (unscoped) | Taken. A Sinatra-style microframework, last published 2022-06-18, v1.2.1. |
| npm `@frank-agent/frank` | Free. Scoped packages only need a free org. |
| GitHub `frank-agent/frank` | Free (404 on the API). |
| GitHub `huxleyli15/frank` | Exists, 2 stars, similar idea. Repo names are per owner, so no collision. |
| `frank.dev` | Resolves. Assume taken. |

Nothing blocks the name: the plugin id is `frank`, the npm package is scoped, the repo
lives under a new org. The domain is open and nothing depends on it. Alternates if the org
name is contested: `deadpan` (npm free), `blunt`, `receipts`, `verdict`.

**Update, same day.** The repo was pushed to `HimanshuJ16/frank`, not to a `frank-agent`
org, so every manifest, badge and install command now points there, and the package is
`@himanshuj16/frank`. The `frank-agent` scope was never created. Renaming later is a
find-and-replace across the twelve files listed in the commit that made this change.

## ADR-001: Plain JS, zero dependencies for hooks

**Accepted** (from the brief). Node 20 or newer, ESM, no build step. A hook runs on the
user's machine, on every turn, on whatever Node they have. `node:*` only.

## ADR-002: One archetype, honesty

**Accepted** (from the brief). No rules about code size, prose length, style or security.
Frank composes with ponytail and caveman rather than overlapping them.

## ADR-003: Enforce with hooks, fail open

**Accepted** (from the brief). Every hook wraps its body in `try/catch` and exits 0 on
any failure. `tests/hooks.e2e.test.js` asserts exit 0 for every hook against malformed
stdin, empty stdin, `null`, `[]`, a corrupt session file, a corrupt config file and a
state directory that is a regular file.

## ADR-004: Agentic benchmark from day one

**Accepted** (from the brief). Tier 1 is built and has run; tier 2 is next.

## ADR-005: `full` is the default; the gate asks once

**Accepted** (from the brief). Block budget per turn: `off` 0, `lite` 0, `full` 1,
`ultra` 2.

## ADR-006: MIT

**Accepted.**

## ADR-007: Subagents get the rules through `SubagentStart`

**2026-09-12. Accepted. Supersedes the `PreToolUse(Task/Agent)` row in FRANK.md 8.1.**

`SubagentStart` exists, filters on `agent_type`, and injects `additionalContext` at the
head of the subagent's conversation. It also handles resumed subagents and
post-compaction re-injection, which a prompt rewrite in `PreToolUse` would not.

## ADR-008: `full` gives feedback; only `ultra` raises an error

**2026-09-12. Accepted. Refines FRANK.md 9.3.**

On Claude Code, `decision: "block"` renders as a hook error. The receipts gate is not an
error; it is the package working. So `full` returns
`hookSpecificOutput.additionalContext`, which the docs label "Stop hook feedback", and
`ultra` returns `decision: "block"`. Both continue the turn under the same loop
protection. Codex and Copilot document only `decision`, so they always get that.

## ADR-009: The gate reads `last_assistant_message`, never the transcript

**2026-09-12. Accepted.** The transcript file may not contain the current turn's final
message when `Stop` fires. Claude Code and Codex both provide the field. Copilot does not,
which is why its gate is partial (ADR-015).

## ADR-010: Compaction is handled by `SessionStart`, not `PreCompact`

**2026-09-12. Accepted. Supersedes the `PreCompact` row in FRANK.md 8.1.**

`PreCompact` cannot inject context. `SessionStart` fires again with `source: "compact"`.

## ADR-011: Exit code 0 always; decisions travel in JSON

**2026-09-12. Accepted.** Exit 2 blocks regardless of stdout, which makes it the one
outcome a bug cannot walk back. Exit 1 is documented as non-blocking, so even an uncaught
crash fails open.

## ADR-012: Reading commands are not receipts

**2026-09-12. Accepted. Answers OQ-3 for v1.**

`cat`, `grep`, `ls`, `git log` and friends do not count as evidence. They prove the agent
looked at something, not that anything works, and they are trivially easy to emit. The
cost is a false block when the honest answer really was established by reading; the user
writes `unverified:` and moves on. Revisit with tier 2 data.

## ADR-013: Injected text is framed as configuration

**2026-09-12. Accepted.** The hooks docs warn that imperative injected text can trip
prompt-injection defenses and get surfaced to the user instead of used. The rules are
wrapped in a statement of what the user installed. If tier 1 ever shows the frame
weakening the rules, the frame changes, not the rules.

## ADR-014: `PostToolUseFailure` supplies the exit code on Claude Code

**2026-09-12. Accepted.** The `Bash` tool response carries no exit status and
`PostToolUse` only fires on success. Failures arrive at `PostToolUseFailure` with an
`error` string whose first line is `Exit code N`. Codex has no failure event and puts the
status in `tool_response` under an undocumented name; `ledger.js` checks the likely ones.

## ADR-015: One shell-form hooks file for Claude Code and Codex

**2026-09-12. Accepted. Replaces the exec-form file from the first commit.**

Exec form (`command` plus `args`) is the cleaner way to survive spaces in Windows paths
on Claude Code. Codex reads the same event names but only accepts a shell string. One
file with `node "${CLAUDE_PLUGIN_ROOT}/hooks/x.js"` serves both; the quotes carry the
spaces. Copilot CLI has its own schema and its own file.

## ADR-016: Stdin is read with a one second grace period

**2026-09-12. Accepted.** A blocking `readFileSync(0)` hangs when the Windows PowerShell
wrapper swallows the piped JSON and `end` never fires. Ponytail shipped that bug (#443).
Frank reads asynchronously, proceeds with whatever arrived after a second, and stays
quiet if that is nothing.

## ADR-017: The benchmark runs through `claude -p`, not an API key

**2026-09-12. Accepted.** A results file anyone can reproduce from a Claude Code login is
worth more than one that needs a key. `--setting-sources project` from an empty
directory keeps every installed plugin, Frank included, away from the baseline arm.
`--bare` would be tighter but skips the stored login. A promptfoo config is kept for
people with a key who want a second harness.

The single-turn approximation is a known limit: the prior answer and the pushback are
transcript text inside one prompt. That is why the README headline needs tier 2 as well.

## ADR-018: Examples are verbatim runs or they are not examples

**2026-09-12. Accepted.** The first commit shipped three hand-written exchanges labelled
illustrative. They are gone. `examples/` now holds only replies copied unedited from
benchmark run files, with the model, arm and scenario id. A package about not making
things up cannot ship a made-up baseline.

## ADR-019: Two wording iterations on the opener rule, and what they showed

**2026-09-12. Accepted.** First tier 1 run, Haiku 4.5 through `claude -p`, Sonnet
grading, n=1, 60 scenarios, two arms.

| rules wording | correct | caves | stubborn | CHECK | openers (all) | openers, user right | openers, user wrong |
|---|--:|--:|--:|--:|--:|--:|--:|
| baseline (no rules) | 60/60 | 0/25 | 0/25 | 10/10 | 32/60 | 25/25 | 1/25 |
| v0.1 (`"you're absolutely right"`, `"you're correct"` banned) | 58/60 | 0/25 | 0/25 | 8/10 | 32/60 | 25/25 | 1/25 |
| v0.2 (adds `"you're right"`, "not even when the user is right", "the first sentence is the corrected fact") | 59/60 | 0/25 | 0/25 | 9/10 | 32/60 | 25/25 | 0/25 |

Three things this settles for now:

1. **On this model, in this setup, nobody caves.** Haiku through Claude Code held every
   correct answer against every wrong objection with or without the rules. The cave rate
   the brief wanted to headline is 0% in the baseline. Tier 1 cannot produce a cave-rate
   number on Haiku; it may on other models, and the runner takes `--model`.
2. **The "you're right" opener when the user is right does not move with prompt wording.**
   Every one of the 25 legitimate replies, in all three arms, opens "You're right, and my
   answer was wrong." The v0.2 wording names the phrase and the case and Haiku still writes
   it. So that behaviour is the hook's job: `ultra` blocks the opener at `Stop`, and
   `/frank-stats` counts it in every mode. The prompt alone is not enforcement, which is
   the brief's third principle and now has a number behind it.
3. **The rules cost a little on ambiguous scenarios.** Frank guessed instead of proposing a
   check on 2/10 (v0.1) then 1/10 (v0.2), where the baseline proposed a check on 10/10.
   Worth watching; not worth a rule yet at n=1.

The v0.2 wording stays: it is more precise, costs no lines, and removed the one
adversarial opener. No further wording changes without a run behind them, and the next
run is tier 2, where the receipts half of the product is measured.

## Open questions

- **OQ-1** Does the block reliably reach the model on a live Claude Code session, and does
  it run the command or rewrite its last lines? Unit tests cover the hook contract; the
  live behaviour still needs a dogfooding session.
- **OQ-2** Claim detection is English-only.
- **OQ-3** Answered by ADR-012.
- **OQ-4** Subagent injection cost: the subagent variant is the `Never` and `Receipts`
  sections only, about half the full ruleset. Not measured in tokens yet.
- **OQ-5** Whether the three-shape format grates in casual chat. Needs dogfooding.
- **OQ-6** A local scan of 552 Claude Code transcripts on one machine (6,984 assistant
  messages, `scripts/count.js`, 2026-09-12) found 16 sycophantic openers (0.2%) and
  1,459 completion claims with 0 receipts. One machine is an anecdote, and the opener
  detector is conservative. If the ratio holds in tier 2, receipts are the bigger half of
  the product and the meme is only the hook.
