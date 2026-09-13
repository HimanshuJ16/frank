---
name: frank-verify
description: Find and run the verification for the change just made, then write the receipt. Use when the user types /frank-verify, asks for proof that a change works, or when a completion claim needs backing before ending the turn.
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/suggest.js"*)
---

# /frank-verify

Produce a real receipt for the most recent change. Four steps, in order.

**1. Find the verification command.** Run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/suggest.js" .
```

It prints the command this repo's own config implies and, on Claude Code, what this
session's ledger has recorded since the last edit. If something already ran after the
last edit, that is the receipt: quote it and skip to step 4. If it prints
`none detected`, look for a test script, a CI workflow, or a Makefile target yourself.
If there is still nothing, skip to step 4.

**2. Narrow it.** Prefer the smallest command that actually covers the change:
the single test file over the whole suite, the typecheck over the full build.
A narrow command that ran beats a broad one that didn't.

**3. Run it.** Run the command for real. Do not summarise from memory, do not
predict the output, do not reuse a result from before the change.

**4. Write the receipt** as the last lines of your message:

```
ran: <the exact command>
result: <the real summary: N passed / exit code / the failing line>
```

If the command failed, say what failed. A failing receipt is still a receipt;
a claim that contradicts it is not.

If nothing can verify the change, end with:

```
unverified: <the check that would settle it, and why it doesn't exist yet>
```

Offer to write that check. Do not claim the change works.

$ARGUMENTS
