# Which file goes to which host

Every file in the right-hand column is **generated** from `rules/frank.md` by
`npm run build:adapters`. Do not hand-edit them; CI fails on drift
(`npm run check`). To change the rules, change `rules/frank.md` and rebuild.

## Tier 1 — ruleset + modes + receipts gate

Hooks run, so the gate can ask for a receipt.

| Host | Files | Status |
|---|---|---|
| Claude Code | `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `hooks/hooks.json`, `hooks/*.js`, `skills/*/SKILL.md` | Shipped |
| Codex CLI / desktop | `.codex-plugin/plugin.json`, `hooks/codex-hooks.json` | Phase 3 |
| OpenCode | `opencode.json`, `AGENTS.md`, `@frank-agent/frank` plugin entry | Phase 3 |

## Tier 2 — ruleset + commands, no gate

| Host | File | Status |
|---|---|---|
| GitHub Copilot CLI | plugin manifest | Phase 3 |
| Gemini CLI / Antigravity | `gemini-extension.json` + `GEMINI.md` | `GEMINI.md` shipped, manifest Phase 3 |

## Tier 3 — always-on ruleset only

No modes, no gate. The rules are injected by the host's own instruction mechanism.

| Host | File | Status |
|---|---|---|
| Any AGENTS.md-aware host | `AGENTS.md` | Shipped |
| Cursor | `.cursor/rules/frank.mdc` (`alwaysApply: true`) | Shipped |
| Windsurf | `.windsurf/rules/frank.md` (`trigger: always_on`) | Shipped |
| Cline | `.clinerules/frank.md` | Shipped |
| Kiro | `.kiro/steering/frank.md` (`inclusion: always`) | Shipped |
| Qoder | `.qoder/rules/frank.md` | Shipped |
| GitHub Copilot Chat | `.github/copilot-instructions.md` | Shipped |
| JetBrains Junie | `.junie/guidelines.md` | Shipped |
| Zed | `.zed/rules/frank.md` | Shipped |
| Aider | `CONVENTIONS.md` | Shipped |
| Amp, Jules, CodeWhale, Swival | `AGENTS.md` | Shipped by proxy |

## Tier 4 — per-host recipe

pi, Hermes, Devin, Grok Build, OpenClaw. Community PRs. Each needs: the adapter file,
a README install section, and an entry in `TARGETS` in `scripts/adapters.js` so the
drift check covers it.

## Adding a host

1. Add the path and a `render(body)` function to `TARGETS` in `scripts/adapters.js`.
2. `npm run build:adapters`.
3. `npm test` — `tests/adapters.test.js` picks the new target up automatically.
4. Add a row here and an install section to the README.

Never copy the rules text by hand. That is the whole point of the drift check.
