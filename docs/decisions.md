# Decisions

ADRs, newest last. A decision that turned out wrong gets a follow-up ADR, not an edit.

---

## ADR-000: The name is Frank

**2026-09-12. Accepted.**

Availability, checked today:

| Surface | Result |
|---|---|
| npm `frank` (unscoped) | **Taken** — a Sinatra-like microframework, last published 2022-06-18, v1.2.1. |
| npm `@frank-agent/frank` | Free. Scoped packages only need a free org. |
| GitHub `frank-agent/frank` | Free (404 on the API). |
| GitHub `huxleyli15/frank` | Exists, 2 stars, similar idea. Repo names only need to be unique per owner, so this does not collide. |
| `frank.dev` | Resolves. Assume taken. |

Nothing blocks the name: the plugin id is `frank`, the npm package is scoped, the repo
lives under a new org. The domain is the only open item and nothing in the product
depends on it. Alternates if the org name is contested: `deadpan` (npm free), `blunt`,
`receipts`, `verdict`.

## ADR-001: Plain JS, zero dependencies for hooks

**Accepted** (from the brief). Node ≥ 20, ESM, no build step. A hook runs on the user's
machine, on every turn, on whatever Node they have. `node:test` and `node:*` only.

## ADR-002: One archetype — honesty

**Accepted** (from the brief). No rules about code size, prose length, style, or
security. Frank must compose with ponytail and caveman rather than overlap them.

## ADR-003: Enforce with hooks, fail open

**Accepted** (from the brief). Every hook wraps its body in `try/catch` and exits 0 on
any failure. `tests/hooks.e2e.test.js` asserts exit 0 for every hook against malformed
stdin, empty stdin, `null`, `[]`, a corrupt session file, a corrupt config file, and a
state directory that is a regular file.

## ADR-004: Agentic benchmark from day one

**Accepted** (from the brief). Not yet built — Phase 2.

## ADR-005: `full` is the default; the gate asks once

**Accepted** (from the brief). Budget per turn: `off` 0, `lite` 0, `full` 1, `ultra` 2.

## ADR-006: MIT

**Accepted.**

---

## ADR-007: Subagents get the ruleset through `SubagentStart`

**2026-09-12. Accepted. Supersedes FRANK.md §8.1's `PreToolUse(Task/Agent)` row.**

`SubagentStart` exists, filters on `agent_type`, and injects `additionalContext` at the
head of the subagent's conversation. It also handles resumed subagents and post-compaction
re-injection, which a `PreToolUse` prompt rewrite would not. See `docs/hooks.md`.

## ADR-008: `full` gives feedback; only `ultra` raises an error

**2026-09-12. Accepted. Refines FRANK.md §9.3.**

`decision: "block"` renders in the transcript as a hook *error*. The receipts gate is not
an error — it is the package working. So `full` returns
`hookSpecificOutput.additionalContext`, which the docs label "Stop hook feedback", and
`ultra` returns `decision: "block"`. Both continue the turn and both are loop-protected
identically. The user chose `ultra` on purpose.

## ADR-009: The gate reads `last_assistant_message`, never the transcript

**2026-09-12. Accepted.** The transcript file may not contain the current turn's final
message when `Stop` fires. `last_assistant_message` is the documented field for this.
Side effect: the gate needs no transcript parsing, no JSONL reader, and no file I/O on
the hot path beyond its own small session ledger.

## ADR-010: Compaction is handled by `SessionStart`, not `PreCompact`

**2026-09-12. Accepted. Supersedes FRANK.md §8.1's `PreCompact` row.**

`PreCompact` cannot inject context. `SessionStart` fires again with `source: "compact"`,
which is where re-injection belongs. The banner is suppressed for that source.

## ADR-011: Exit code 0, always; decisions travel in JSON

**2026-09-12. Accepted.** Exit 2 blocks regardless of stdout, which makes it the one
outcome a bug cannot walk back. Frank never uses it. Exit 1 is documented as
*non-blocking*, so even an uncaught crash fails open.

## ADR-012: Reading commands are not receipts

**2026-09-12. Accepted. Answers OQ-3 for v1.**

`cat`, `grep`, `ls`, `git log` and friends do not count as evidence. They prove the agent
looked at something, not that anything works, and they are trivially easy to emit. The
cost is a false block when the honest answer really was established by reading — the user
writes `unverified:` and moves on. Revisit with benchmark data.

## ADR-013: Injected text is framed as configuration

**2026-09-12. Accepted.** The hooks docs warn that imperative injected text can trip
Claude's prompt-injection defenses and get surfaced to the user instead of used. The
ruleset is wrapped in a statement of what the user installed and configured. If Tier 1
shows the frame weakens the rules, the frame changes, not the rules.

## ADR-014: `PostToolUseFailure` supplies the exit code

**2026-09-12. Accepted.** The `Bash` tool response carries `stdout`/`stderr` but no exit
status, and `PostToolUse` only fires on success. Failures arrive at `PostToolUseFailure`
with an `error` string whose first line is `Exit code N`. The ledger records 0 for the
success path and parses N for the failure path, which is what makes the *contradiction*
check ("claim says fixed; `pytest` exited 1") possible.

---

## Open questions

- **OQ-1** Does the block reliably reach the model, and does it then run the command or
  just rewrite the last lines? Not yet measured. Needs a live session, not a unit test.
- **OQ-2** Claim detection is English-only. Unchanged.
- **OQ-3** Answered by ADR-012 for v1.
- **OQ-4** Subagent injection cost: the subagent variant is the `## Never` and
  `## Receipts` sections only, roughly half the full ruleset. Not yet measured in tokens.
- **OQ-5** Whether the three-shape format grates in casual chat. Needs dogfooding.
- **OQ-6** *(new)* Baseline measurement from 552 local Claude Code transcripts
  (6,984 assistant messages, this machine, `scripts/count.js`, 2026-09-12):
  **16 sycophantic openers (0.2%)** but **1,459 completion claims, 0 with a receipt**.
  One machine and one user is not a dataset, and the opener detector is conservative by
  design. But if the ratio holds up in Tier 2, the headline number should come from
  receipts, not from "you're absolutely right" — the meme is the hook, the unverified
  "done" is the damage.
