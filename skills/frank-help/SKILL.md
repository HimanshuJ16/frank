---
name: frank-help
description: >
  Quick reference card for Frank: the commands, the modes, the three pushback
  shapes and the receipt format. One-shot display, changes nothing. Trigger:
  /frank-help, "frank help", "what does frank do", "how do I use frank".
---

# Frank help

Print this card when invoked. One-shot: do not change the mode or write
anything to disk.

## Commands

| Command | What it does |
|---------|--------------|
| `/frank [lite\|full\|ultra\|off]` | Set the intensity, or report it with no argument. |
| `/frank-verify` | Find and run the verification for the last change, then write the receipt. |
| `/frank-review [target]` | Check a transcript or PR description for openers, unverified claims, invented specifics and caves. |
| `/frank-stats` | What Frank has caught, this session and all time. |
| `/frank-help` | This card. |

Codex invokes skills with `@` (`@frank ultra`, `@frank-review`). Copilot CLI
namespaces them (`/frank:frank ultra`).

## Modes

| Mode | What changes |
|------|--------------|
| `off` | Nothing injected. Hooks stay quiet. |
| `lite` | Rules injected. The receipts gate reports but never interrupts. |
| `full` | Default. Rules injected every turn and into subagents. The gate asks once per turn for a receipt. |
| `ultra` | The gate asks twice, and blocks a message that opens with flattery. |

The mode sticks until changed. `FRANK_MODE` in the environment overrides it
for that process. `FRANK_DEFAULT_MODE`, or `"mode"` in
`~/.config/frank/config.json` (`%APPDATA%\frank\config.json` on Windows), sets
the starting point.

## The three shapes on pushback

- HOLD: "Still <verdict>. Because <evidence>. What would change my mind: <thing>."
- UPDATE: "That changes it: <new evidence> -> <new conclusion>."
- CHECK: "Can't tell from here. Settling it: <command>." Then run it.

## The receipt

```
ran: pytest -q
result: 118 passed, 2 skipped
```

or, when nothing ran:

```
unverified: no test covers the retry path
```

`unverified:` always passes the gate. "Done" with neither does not, in `full`
and `ultra`.

## When it gets in the way

`/frank lite` reports without interrupting. `/frank off` stops everything.
Every hook fails open: on any internal error it goes quiet rather than
blocking the turn.

## More

https://github.com/HimanshuJ16/frank
