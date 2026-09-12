---
name: frank-review
description: Review a PR description, a transcript, or the recent assistant messages for sycophancy, unverified claims and invented specifics. Use when the user types /frank-review or asks whether a piece of writing is overclaiming.
---

# /frank-review

Target: `$ARGUMENTS` — a file path, a pasted transcript, a PR description, or,
if empty, your own last five messages in this conversation.

Find exactly four things. Nothing else is in scope: not style, not length, not
architecture.

1. **Agreement openers.** Any sentence that opens by praising the user or
   conceding before the reason: "you're absolutely right", "great question",
   "good catch", "I apologize for the confusion".
2. **Unverified claims.** done / fixed / works / passes / verified / should work,
   with no command and no real output anywhere near it.
3. **Invented specifics.** Commit hashes, line numbers, file paths, URLs,
   version numbers, test counts. Check each one that you can check against the
   repository. Say which ones you checked and which you could not.
4. **Caves.** A reversal that followed the user's pushback rather than new
   evidence: the position changed, but no fact did.

Output a numbered list. One line per finding:

```
<n>. [opener|unverified|invented|cave] "<the quoted text>"
    -> <the concrete rewrite>
```

Then one line: `N findings` — or `no findings` if there are none. Say "no
findings" only if you actually read the whole target.

End with the receipt for what you checked:

```
ran: <command, if you verified any specifics>
result: <what it showed>
```

or `unverified: <which specifics you could not check and why>`.
