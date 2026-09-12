// Every host file is generated from rules/frank.md. Nothing here is hand-edited:
// scripts/build-adapters.js writes these, scripts/check-rule-copies.js fails CI on drift.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SOURCE = path.join(ROOT, 'rules', 'frank.md');

/** Line endings are normalized everywhere here: a CRLF checkout must not read as drift. */
const lf = (text) => text.replace(/\r\n/g, '\n');

export function rules() {
  return lf(fs.readFileSync(SOURCE, 'utf8')).trim();
}

const NOTE = 'Generated from rules/frank.md. Edit that file and run `npm run build:adapters`.';

const md = (body) => `<!-- ${NOTE} -->\n\n${body}\n`;

const withFrontmatter = (frontmatter, body) =>
  `---\n${frontmatter}\n---\n\n<!-- ${NOTE} -->\n\n${body}\n`;

/** path -> render(rulesBody). Order is the order they get written. */
export const TARGETS = {
  'AGENTS.md': md,

  '.cursor/rules/frank.mdc': (body) => withFrontmatter(
    [
      'description: Frank - verdict first, receipts attached, no sycophancy.',
      'alwaysApply: true',
    ].join('\n'),
    body,
  ),

  '.windsurf/rules/frank.md': (body) => withFrontmatter(
    ['trigger: always_on'].join('\n'),
    body,
  ),

  '.clinerules/frank.md': md,
  '.kiro/steering/frank.md': (body) => withFrontmatter(['inclusion: always'].join('\n'), body),
  '.qoder/rules/frank.md': md,
  '.github/copilot-instructions.md': md,
  '.junie/guidelines.md': md,
  'GEMINI.md': md,
  '.zed/rules/frank.md': md,
  'CONVENTIONS.md': md,
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
