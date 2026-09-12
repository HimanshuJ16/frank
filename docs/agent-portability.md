# Agent portability

`rules/frank.md` holds the behavior. Everything else in the table is an adapter that
gets that text in front of a particular agent, and where the host allows it, runs the
hooks that enforce it.

Three tiers:

- **gate**: hooks run, so unverified "done" is handed back to the model.
- **rules + commands**: always-on rules and the `/frank` commands, no gate.
- **rules**: always-on rules only.

## Supported adapters

| Host | Files | Tier | Notes |
|------|-------|------|-------|
| Claude Code | `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `hooks/claude-codex-hooks.json`, `hooks/`, `skills/` | gate | Full plugin: rules every turn and into subagents, ledger, gate, mode switching, five skills. |
| Codex | `.codex-plugin/plugin.json`, `hooks/claude-codex-hooks.json`, `hooks/`, `skills/` | gate | Same hooks file as Claude Code. The gate blocks with `decision: "block"`; the badge shows `FRANK:MODE`. Hooks must be trusted once in `/hooks`. |
| GitHub Copilot CLI | `.github/plugin/plugin.json`, `.github/plugin/marketplace.json`, `hooks/copilot-hooks.json`, `commands/`, `skills/` | gate (partial) | Rules on `sessionStart`, ledger on `postToolUse`, gate on `agentStop`. The gate reads the final message from the transcript file Copilot passes, so it is best-effort. `/frank:frank ultra` switches modes. |
| OpenCode | `opencode.json`, `.opencode/plugins/frank.mjs`, `.opencode/command/`, `skills/` | rules + commands | Plugin appends the rules to the system prompt each turn and persists `/frank` switches. No hook exposes the final message, so no gate. |
| Gemini CLI / Antigravity | `gemini-extension.json`, `AGENTS.md`, `commands/`, `skills/` | rules + commands | `contextFileName` points at `AGENTS.md`; `commands/*.toml` are auto-discovered. No `hooks/hooks.json` on purpose (Gemini would auto-load Claude event names). |
| Qoder | `.qoder-plugin/plugin.json`, `.qoder/rules/frank.md`, `hooks/qoder-hooks.json`, `skills/`, `AGENTS.md` | gate (manual wiring) | Zero setup from a checkout via `AGENTS.md`. Full tier by copying the hooks template into `.qoder/settings.json`. |
| Devin CLI | `.devin-plugin/plugin.json`, `skills/` | rules + commands | Skills appear as `/frank:frank` and so on. |
| Grok Build | `plugin.json`, `.grok-plugin/marketplace.json`, `skills/` | rules + commands | Grok's hook output cannot inject instructions, so no hooks. |
| Cursor | `.cursor/rules/frank.mdc` | rules | `alwaysApply: true`. |
| Windsurf | `.windsurf/rules/frank.md` | rules | `trigger: always_on`. |
| Cline | `.clinerules/frank.md` | rules | |
| Kiro | `.kiro/steering/frank.md` | rules | `inclusion: always`. Copy to `~/.kiro/steering/` for every project. |
| GitHub Copilot Chat (editor extension) | `.github/copilot-instructions.md` | rules | Repository instruction file. The standalone Copilot CLI is the plugin row above. |
| Antigravity workspace rules | `.agents/rules/frank.md` | rules | |
| JetBrains Junie | `.junie/guidelines.md`, `AGENTS.md` | rules | Point Junie at `AGENTS.md` in Settings, Tools, Junie, Guidelines Path. |
| Zed | `.zed/rules/frank.md`, `AGENTS.md` | rules | Zed also reads `AGENTS.md` from the worktree root. |
| Aider | `CONVENTIONS.md` | rules | |
| Amp, Jules, CodeWhale, Swival, VS Code + Codex extension | `AGENTS.md` | rules | Each reads `AGENTS.md` from the repo root with no setup. |

## Adapter rule

Keep adapters thin. When a host supports skills or hooks, point it at the existing
`skills/` and `hooks/` files. When a host only supports instruction files, its copy is
generated from `rules/frank.md` and checked by `scripts/check-rule-copies.js`; never edit
the copy.

## Adding a host

1. If the host takes an instruction file: add the path and a `render(body)` function to
   `TARGETS` in `scripts/adapters.js`, run `npm run build:adapters`.
2. If the host takes a manifest: add it, add its version file to `VERSION_FILES` in
   `scripts/check-versions.js`, and add a smoke test to `tests/adapters-hosts.test.js`.
3. If the host runs hooks: read its hook docs first and add a dated section to
   `docs/hooks.md` before writing any code. Add host detection to `hooks/lib/host.js` if
   it needs a different output shape.
4. Add a row above and an install section to the README.
