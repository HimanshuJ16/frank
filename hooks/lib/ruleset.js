// Loads the ruleset from the single source of truth and frames it for injection.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const RULES_FILE = path.resolve(HERE, '..', '..', 'rules', 'frank.md');

let cached = null;

export function rulesText() {
  if (cached !== null) return cached;
  try {
    cached = fs.readFileSync(RULES_FILE, 'utf8').replace(/\r\n/g, '\n').trim();
  } catch {
    cached = '';
  }
  return cached;
}

/** The sections a subagent needs: the bans and the receipt format (OQ-4: keep it cheap). */
export function subagentRulesText() {
  const text = rulesText();
  if (!text) return '';
  const wanted = ['## Never', '## Receipts'];
  const sections = text.split(/\n(?=## )/);
  const picked = sections.filter((s) => wanted.some((w) => s.startsWith(w)));
  return picked.length ? `# Frank\n\n${picked.join('\n\n').trim()}` : text;
}

/**
 * Framed as a statement about the user's configuration rather than as an
 * out-of-band instruction: the hooks docs warn that imperative injected text can
 * trip Claude's prompt-injection defences and get surfaced to the user instead.
 */
export function frameForInjection(body, mode) {
  if (!body) return '';
  return [
    `The user has installed the Frank behavior package (mode: ${mode}). Frank is how the user`,
    'wants this session to answer: verdict first, receipts attached, no flattery. These are',
    'the rules the user configured:',
    '',
    body,
    '',
    mode === 'lite'
      ? 'In lite mode the receipts check reports but never interrupts.'
      : 'A Stop hook checks the last message for completion claims without a receipt.',
  ].join('\n');
}
