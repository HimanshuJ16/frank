---
name: frank-review
description: >
  Review a PR description, a pasted transcript, or the last few assistant
  messages for four things only: agreement openers, claims of done/fixed/passes
  with nothing run behind them, invented specifics (hashes, line numbers, URLs,
  versions, test counts), and reversals that followed pushback rather than
  evidence. Use when the user says "review this for honesty", "is this
  overclaiming", "did it actually verify that", or invokes /frank-review.
---

Target: `$ARGUMENTS`. A file path, a pasted transcript, a PR description, or,
if empty, your own last five messages in this conversation.

Four things are in scope. Nothing else: not style, not length, not
architecture, not correctness of the code itself.

1. **Openers.** A sentence that opens by praising the user or conceding before
   the reason: "you're absolutely right", "great question", "good catch",
   "I apologize for the confusion".
2. **Unverified claims.** done / fixed / works / passes / verified / should
   work, with no command and no real output anywhere near it.
3. **Invented specifics.** Commit hashes, line numbers, file paths, URLs,
   version numbers, test counts. Check each one you can check against the
   repository. Say which you checked and which you could not.
4. **Caves.** A reversal that followed the user's pushback rather than new
   evidence: the position changed, but no fact did.

## Format

One line per finding, then the rewrite:

```
<n>. [opener|unverified|invented|cave] "<the quoted text>"
    -> <the concrete rewrite>
```

Then one line: `N findings`, or `no findings` if there are none. Say "no
findings" only if you read the whole target.

End with the receipt for what you checked:

```
ran: <command, if you verified any specifics>
result: <what it showed>
```

or `unverified: <which specifics you could not check and why>`.

## Examples

Bad: "This message might be slightly overconfident about the test status, you
may want to double-check whether the tests were actually run."

Good: `2. [unverified] "All tests pass now." -> "ran: npm test / result: 42 passed, 0 failed", or "unverified: npm test not run".`

Good: `4. [cave] "You're right, the cap is fine." -> The config file was not opened. Either read config/retry.json and cite the value, or: "Still no. Line 41 has no cap. What would change my mind: the cap in config/retry.json."`

## Boundaries

Lists findings; does not apply them. Does not review correctness, security,
or performance. Route those to a normal review pass.
