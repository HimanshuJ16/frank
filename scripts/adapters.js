// Every host file that carries the rules is generated from rules/frank.md.
// build-adapters.js writes them; check-rule-copies.js fails CI when one has
// been edited by hand.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SOURCE = path.join(ROOT, 'rules', 'frank.md');

// A CRLF checkout must not read as drift.
const lf = (text) => text.replace(/\r\n/g, '\n');

export function rules() {
  return lf(fs.readFileSync(SOURCE, 'utf8')).trim();
}

const NOTE = 'Generated from rules/frank.md. Edit that file and run `npm run build:adapters`.';

const plain = (body) => `<!-- ${NOTE} -->\n\n${body}\n`;

const withFrontmatter = (frontmatter, body) =>
  `---\n${frontmatter}\n---\n\n<!-- ${NOTE} -->\n\n${body}\n`;

// The /frank skill is the ruleset plus the mode switch. Hosts that load skills
// but run no hooks (Gemini, Grok, Devin, Swival) get the rules through it.
const skill = (body) => `---
name: frank
description: >
  Honest senior dev mode. Verdict first, receipts last, no flattery. Holds a
  correct answer under pushback and updates on evidence, never on tone. Will
  not say done, fixed, or passes without a command that ran in this session.
  Modes: lite, full (default), ultra, off. Use on any coding task, and whenever
  the user says "frank", "be honest", "don't flatter me", "did you actually
  run it", "show me the receipt", or pushes back on an answer.
argument-hint: "[lite|full|ultra|off]"
license: MIT
allowed-tools: Bash(node "\${CLAUDE_PLUGIN_ROOT}/scripts/mode.js"*)
---

<!-- ${NOTE} -->

${body}

## Modes

If invoked with an argument (\`$ARGUMENTS\`), run this and report its one line
of output, nothing more:

\`\`\`bash
node "\${CLAUDE_PLUGIN_ROOT}/scripts/mode.js" $ARGUMENTS
\`\`\`

| mode | what changes |
|---|---|
| \`off\` | Nothing injected. Hooks stay quiet. |
| \`lite\` | Rules injected. The receipts gate reports but never interrupts. |
| \`full\` | Default. Rules injected every turn and into subagents. The gate asks once per turn for a receipt. |
| \`ultra\` | The gate asks twice, and also blocks a message that opens with flattery. |

The mode persists until changed. \`FRANK_MODE\` in the environment overrides it.
`;

/** path -> render(rulesBody). */
export const TARGETS = {
  'AGENTS.md': plain,
  'skills/frank/SKILL.md': skill,
  '.cursor/rules/frank.mdc': (body) => withFrontmatter(
    'description: Frank. Verdict first, receipts attached, no sycophancy.\nglobs:\nalwaysApply: true',
    body,
  ),
  '.windsurf/rules/frank.md': (body) => withFrontmatter('trigger: always_on', body),
  '.clinerules/frank.md': plain,
  '.kiro/steering/frank.md': (body) => withFrontmatter('title: Frank\ninclusion: always', body),
  '.qoder/rules/frank.md': plain,
  '.agents/rules/frank.md': plain,
  '.github/copilot-instructions.md': plain,
  '.junie/guidelines.md': plain,
  '.zed/rules/frank.md': plain,
  'GEMINI.md': plain,
  'CONVENTIONS.md': plain,
};

export function render(target, body) {
  return TARGETS[target](body);
}

export function readTarget(target) {
  try {
    return lf(fs.readFileSync(path.join(ROOT, target), 'utf8'));
  } catch {
    return null;
  }
}

export function writeTarget(target, content) {
  const file = path.join(ROOT, target);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}
