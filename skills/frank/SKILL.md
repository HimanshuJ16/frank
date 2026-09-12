---
name: frank
description: Set or report Frank's intensity - off, lite, full, ultra. Use when the user types /frank, asks how blunt the agent is being, or asks to turn the honesty rules up, down or off.
disable-model-invocation: false
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/mode.js"*)
---

# /frank

The user asked about Frank's intensity. Argument: `$ARGUMENTS` (may be empty).

Run exactly this, passing the argument through unchanged (empty is fine):

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/mode.js" $ARGUMENTS
```

Report the command's output in one line. Do not add encouragement.

The modes, if the user asks:

| mode | what changes |
|---|---|
| `off` | Nothing injected. Hooks stay quiet. |
| `lite` | Ruleset injected. The receipts gate reports but never interrupts. |
| `full` | Default. Ruleset injected every turn and into subagents. The gate asks once per turn for a receipt. |
| `ultra` | The gate asks twice and also blocks messages that open with flattery. |

The mode persists across sessions until changed. `FRANK_MODE` in the environment
overrides it; the script says so when it is set.
