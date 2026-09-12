# Frank

**Verdict first. Receipt last. No flattery in between.**

Frank is a behavior package for coding agents. It stops three things: the agent telling
you you're absolutely right, the agent folding the moment you push back on correct code,
and the agent saying "done" without running anything.

```
unverified: the headline number comes from the benchmark in benchmarks/, which has not
            run yet. It goes here when it does, with the method and the raw results.
```

That block is the format Frank makes the agent use. It applies to Frank's own README.

## Before / after

> **You:** is this retry loop fine?
>
> **Before:** Great question! Yes, this looks solid — the exponential backoff is a good
> pattern here. Let me know if you'd like me to add tests!
>
> **Frank:** No. The backoff is unbounded — `retry.js:41` doubles the delay with no cap,
> so a sustained outage parks the worker for hours. Cost of being wrong: the queue drains
> to nothing and nobody pages.
>
> **You:** I'm pretty sure it's fine.
>
> **Frank:** Still no. Line 41 has no cap. What would change my mind: a cap in the
> config, or a max-delay argument I can't see from here.
>
> **You:** `config/retry.json` sets `maxDelayMs`.
>
> **Frank:** That changes it: `maxDelayMs: 30000` is read at line 12 and clamps the
> delay, so it terminates. The loop is fine.

He never said you were right. He said the cap covers it.

## How it works

Two halves, one virtue.

**On pushback, exactly three shapes.** Not "hmm, you may have a point".

- `HOLD` — "Still <verdict>. Because <evidence>. What would change my mind: <thing>."
- `UPDATE` — "That changes it: <new evidence> -> <new conclusion>."
- `CHECK` — "Can't tell from here. Settling it: <command>." — then he runs it.

**On finishing, a receipt.** The last lines of the message are either:

```
ran: pytest -q
result: 118 passed, 2 skipped
```

or:

```
unverified: no test covers the retry path
```

The second one always gets through. Saying "done" with neither does not — a `Stop` hook
watches the final message, and if it claims completion with nothing in the session's
command ledger since the last edit, it hands the claim back once.

That ledger is what makes this more than a prompt. Prompts ask. The gate checks:

- **no receipt** — "you said fixed, nothing ran after the last edit"
- **contradiction** — "you said fixed, the last `pytest` exited 1"
- **invented receipt** — "your receipt cites `pytest -q`, which never ran this session"

## Install

**Claude Code** (hooks, modes, the gate):

```
/plugin marketplace add frank-agent/frank
/plugin install frank@frank
```

**Everything else** — copy the rules file for your host, or point the agent at
`AGENTS.md`. See [docs/agent-portability.md](docs/agent-portability.md) for the table:
Cursor, Windsurf, Cline, Kiro, Qoder, Copilot, Junie, Zed, Aider and any AGENTS.md host
are supported today, with the ruleset only. Codex and OpenCode get hooks in Phase 3.

Zero config. No dependencies. Node ≥ 20.

## Commands

| command | what it does |
|---|---|
| `/frank [off\|lite\|full\|ultra]` | Set the intensity, or report it. |
| `/frank-verify` | Find and run the verification for the last change, then write the receipt. |
| `/frank-review [target]` | Check a transcript or PR description for openers, unverified claims, invented specifics and caves. |
| `/frank-stats` | What Frank has caught, this session and all time. |
| `/frank-help` | Quick reference. |

## Modes

| mode | ruleset | the gate |
|---|---|---|
| `off` | not injected | silent |
| `lite` | injected | reports, never interrupts |
| `full` *(default)* | injected every turn, and into subagents | asks once per turn |
| `ultra` | same | asks twice, and blocks messages that open with flattery |

`FRANK_MODE` in the environment overrides everything. `FRANK_DEFAULT_MODE` sets the
starting point. Or `~/.config/frank/config.json` (`%APPDATA%\frank\config.json` on
Windows).

## FAQ

**Does it argue with me?** Only with evidence. Frank is calibrated, not contrarian —
when you're right he updates and says which fact changed his mind. The benchmark measures
both directions on purpose: caving on correct answers *and* refusing to update on wrong
ones. A package that just disagrees more is not an improvement.

**Does it block me?** In `full`, once per turn. In `ultra`, twice. Never in `lite` or
`off`. Writing `unverified:` always gets through, and the hooks fail open — a crash, a
missing Node, an unreadable state file, and Frank goes quiet rather than stopping your
work. `tests/hooks.e2e.test.js` asserts that against malformed input, corrupt state and
an unwritable state directory.

**Can I use it with ponytail and caveman?** Yes, that's the point. Ponytail shrinks what
the agent builds, caveman shrinks what it says, Frank makes what it says true. No
overlapping rules — Frank contains nothing about code size or prose length.

**What does it store?** Counters and a per-session list of the commands you ran, under
`~/.config/frank/`, pruned after 7 days. No message content, nothing leaves the machine.
`npm run uninstall` lists it and `--yes` deletes it.

**Why "Frank"?** frank, *adj.* — open, honest, and direct in speech, without
concealment or evasion.

## Contributing

The highest-value contributions, in order:

1. **Benchmark scenarios** (`benchmarks/pushback/`) — plausible-but-wrong objections are
   hard to write and they are the whole measurement.
2. **Host adapters** — see [docs/agent-portability.md](docs/agent-portability.md).
3. **Examples** (`examples/`) — real before/after transcripts, host and model named.
   No fabricated baselines. That would be a strange thing to do here.

Changes to `rules/frank.md` must carry the benchmark delta in the PR description.

```
ran: node --test "tests/**/*.test.js"
result: 209 passed, 0 failed (Node 22.10.0, Windows)
```

MIT.
