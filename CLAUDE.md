# Working in this repo

Frank is an agent behavior package: a ruleset, lifecycle hooks, host adapters and a
benchmark. This file is the working agreement; `docs/decisions.md` is the record of why
things are the way they are. The project brief the package was built from is kept
outside the repository.

## Layout

```
rules/frank.md          the product. one screen. every line costs tokens on every turn.
hooks/                  enforcement. plain ESM, no dependencies, fail open.
hooks/lib/              pure logic: claims.js, evidence.js, gate-core.js. tested directly.
hooks/*.json            hook wiring per host family (claude-codex, copilot, qoder).
scripts/adapters.js     the generator. every file that carries the rules comes from rules/frank.md.
skills/                 /frank, /frank-verify, /frank-review, /frank-stats, /frank-help.
commands/               Gemini CLI command files; .opencode/command/ is the OpenCode copy.
benchmarks/pushback/    tier 1: 60 scenarios, claude -p runner, grader, report.
benchmarks/results/     one markdown per run. the README quotes these and nothing else.
docs/hooks.md           what each host's hook API does, dated. read it before touching hooks.
docs/decisions.md       ADRs. write one when you deviate from the brief.
```

## Rules

- Node 20 or newer, plain ESM, zero dependencies. Hooks run on the user's machine on every
  turn, so `node:*` only. TypeScript is allowed in `benchmarks/` tooling and nowhere else.
- Hooks fail open. Top-level `try/catch`, exit 0, no output on error, and stdin is read with
  a one second grace period rather than blocked on. Every hook has a fail-open test.
- One source of truth. Never hand-edit `AGENTS.md`, `skills/frank/SKILL.md`, `.cursor/rules/*`
  or any other rules copy. Edit `rules/frank.md`, run `npm run build:adapters`.
  `npm run check` fails on drift.
- Detectors are table-driven. Add the case to `tests/claims.test.js` before changing a
  regex, and add the must-not-match case next to it. A false positive costs the user a
  blocked turn; a miss only leaves the status quo.
- Read the hook docs before changing a hook. They move. `docs/hooks.md` records what was
  true on the date at its top, with the source URL.
- Nothing from a transcript is ever executed. The ledger records commands; it does not run
  them. `/frank-verify` runs only what the repo's own config implies.
- No rule outside the honesty archetype. Not code size, not prose length, not style, not
  security. Those are other packages.
- Plain punctuation. No em dashes, en dashes, arrows or smart quotes in code, docs or prose.
  A comma, a colon, a full stop or `->` does the job.

## Before you commit

```
npm run check
```

Conventional commits. A change to `rules/frank.md` carries the benchmark delta in the
commit message, because the wording has measurable effects and that file is the product.
Commit messages end with a receipt (`ran:` / `result:`), the same way the rules ask the
agent to.

## Voice

README, skills and hook messages are Frank's voice: short, flat, no encouragement, no
exclamation marks. Docs and code comments are plain prose. Comments explain why, not what.
