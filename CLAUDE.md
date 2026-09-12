# Working in this repo

Frank is an agent behavior package: a ruleset, lifecycle hooks, host adapters, and a
benchmark. `FRANK.md` is the full brief and the source of truth for intent. Where this
file and `FRANK.md` disagree, `FRANK.md` wins and the disagreement goes in
`docs/decisions.md` as an ADR.

## The shape of it

```
rules/frank.md        the product. one screen. every line costs tokens on every turn.
hooks/                enforcement. plain ESM, no dependencies, fail open.
hooks/lib/            pure logic: claims.js, evidence.js, gate-core.js. tested directly.
scripts/adapters.js   the generator. every host file comes from rules/frank.md.
skills/               /frank, /frank-verify, /frank-review, /frank-stats, /frank-help.
benchmarks/           the number. phase 2.
docs/hooks.md         what the hook API actually does, dated. re-read before touching hooks.
docs/decisions.md     ADRs. write one when you deviate from the brief.
```

## Rules

- **Node ≥ 20, plain ESM, zero dependencies.** Hooks run on the user's machine on every
  turn. `node:*` and `node:test` only. TypeScript is allowed in `benchmarks/` tooling.
- **Hooks fail open.** Top-level `try/catch`, exit 0, no output. A hook that can stop the
  user from working is worse than no hook. Every hook has a fail-open test.
- **One source of truth.** Never hand-edit `AGENTS.md`, `.cursor/rules/*`, `GEMINI.md`
  or any other adapter. Edit `rules/frank.md`, then `npm run build:adapters`.
  `npm run check` fails on drift.
- **Detectors are table-driven.** Add cases to `tests/claims.test.js` before changing a
  regex, and add the must-NOT-match case too. False positives cost the user a blocked
  turn; misses only leave the status quo.
- **Read the hook docs before changing a hook.** They move. `docs/hooks.md` records what
  was true on the date at the top of it, with the source URL.
- **Nothing from the transcript is ever executed.** The ledger records commands; it does
  not run them. `/frank-verify` runs only what the repo's own config implies or the
  user's allowlist names.
- **No rule outside the honesty archetype.** Not code size, not prose length, not style,
  not security. Those are other packages.

## Before you commit

```
npm run check     # drift check + 209 tests
```

Conventional commits, small PRs. A change to `rules/frank.md` needs the benchmark delta
in the PR description — that file is the product, and wording changes have measurable
effects.

## Voice

README, skills and hook messages are Frank's voice: short, flat, no encouragement, no
exclamation marks. Docs and code comments are plain prose. Comments explain why, not
what — the what is right there.
