---
name: frank-stats
description: Show what Frank has caught - receipts demanded, sycophantic openers seen, contradictions found - for this session and all time. Use when the user types /frank-stats or asks how often Frank has intervened.
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/stats.js"*)
---

# /frank-stats

Run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/stats.js"
```

Print the output as-is. Do not interpret it as a compliment or a complaint.

To scan your own Claude Code transcripts instead of Frank's counters, that is a
different command and it reads a lot of files:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/count.js"
```

Only run that one if the user asks for the transcript scan.
