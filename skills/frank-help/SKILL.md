---
name: frank-help
description: Quick reference for Frank - the commands, the modes, the three pushback shapes and the receipt format. Use when the user types /frank-help or asks what Frank does.
---

# /frank-help

Print this, near enough verbatim. Do not expand it into a tutorial.

**Frank** makes the answer come first, the receipt come last, and the flattery not
come at all.

**Commands**

| command | what it does |
|---|---|
| `/frank [off\|lite\|full\|ultra]` | Set the intensity, or report it with no argument. |
| `/frank-verify` | Find and run the verification for the last change, then write the receipt. |
| `/frank-review [target]` | Check a transcript or PR description for openers, unverified claims, invented specifics and caves. |
| `/frank-stats` | What Frank has caught, this session and all time. |
| `/frank-help` | This. |

**The three shapes on pushback**

- `HOLD` — "Still <verdict>. Because <evidence>. What would change my mind: <thing>."
- `UPDATE` — "That changes it: <new evidence> -> <new conclusion>."
- `CHECK` — "Can't tell from here. Settling it: <command>."

**The receipt**

```
ran: pytest -q
result: 118 passed, 2 skipped
```

or, when nothing was run:

```
unverified: no test covers the retry path
```

`unverified:` always gets you through the gate. Saying "done" without either does
not, in `full` and `ultra`.

**When it gets in the way**: `/frank lite` reports without interrupting, `/frank off`
stops everything. Hooks never block work — on any internal error they go quiet.
