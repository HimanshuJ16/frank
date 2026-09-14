// A/B the claim detector against real local transcripts: how many messages the
// narrowed rules stop flagging, and whether anything newly flags.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { detectClaim, detectReceipt, sanitize } from '../hooks/lib/claims.js';

// --- the detector exactly as it was before this change ----------------------
const OLD_COMPLETION = [
  /\b(?:it'?s|that'?s|this is|all)?\s*\bdone\b/i,
  /\ball set\b/i,
  /\b(?:i(?:'ve| have)?\s+)?finished\b/i,
  /\b(?:i(?:'ve| have)?\s+)?implemented\b/i,
  /\b(?:i(?:'ve| have)?\s+)?fixed\b/i,
  /\b(?:i(?:'ve| have)?\s+)?resolved\b/i,
  /\bworking now\b/i,
  /\bnow works\b/i,
  /\bshould (?:work|be fixed|pass|be working)\b/i,
  /\bready to (?:go|use|ship|merge)\b/i,
];
const OLD_VERIFICATION = [
  /\b(?:all\s+)?(?:tests?|specs?|suite|checks?|lint|build|ci|everything|they|it|type[- ]?check(?:s|ing)?|tsc)\s+(?:now\s+)?(?:pass|passes|passed|passing)\b/i,
  /\b(?:i\s+)?verified\b/i,
  /\b(?:i\s+)?confirmed\b/i,
  /\bbuilds? (?:successfully|cleanly|fine)\b/i,
  /\bcompiles (?:successfully|cleanly|fine|without errors)\b/i,
  /\b(?:it|this|the code|the project|everything)\s+(?:now\s+)?compiles\b(?!\s+(?:to|into|down))/i,
  /\bno errors\b/i,
  /\btype[- ]?checks? (?:pass|cleanly)\b/i,
];
const NEGATION = /\b(?:not|never|n't|without|cannot|can'?t|unable|un(?:verified|tested|confirmed)|fail(?:s|ed|ing)?|didn'?t|doesn'?t|don'?t|haven'?t|hasn'?t|isn'?t|aren'?t|wasn'?t|no|no longer|none|nothing|nobody|still)\b/i;
const DESCRIPTIVE = /\b(?:is|are|was|were|gets?|being)\s+(?:done|implemented|resolved|handled)\s+(?:in|by|at|through|via|upstream|inside|within|on|using|with|as|per)\b/i;

function oldSentences(text) {
  return sanitize(text).split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
}
function oldDetect(text) {
  for (const s of oldSentences(text)) {
    if (/\?\s*$/.test(s) || /^(?:do|does|did|is|are|was|were|should|can|could|will|would|have|has|shall)\b/i.test(s)) continue;
    if (/^(?:once|when|after|if|unless|let me know|tell me|please)\b/i.test(s)) continue;
    if (/^\s*(?:unverified|ran|result)\s*:/i.test(s)) continue;
    if (DESCRIPTIVE.test(s)) continue;
    for (const patterns of [OLD_COMPLETION, OLD_VERIFICATION]) {
      for (const re of patterns) {
        const m = re.exec(s);
        if (!m) continue;
        if (NEGATION.test(s.slice(Math.max(0, m.index - 45), m.index))) continue;
        return { claim: true, matched: m[0].trim(), sentence: s };
      }
    }
  }
  return { claim: false, matched: null, sentence: null };
}

// --- walk the transcripts ---------------------------------------------------
const root = process.argv[2] || path.join(os.homedir(), '.claude', 'projects');
function* files(dir) {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* files(full);
    else if (e.name.endsWith('.jsonl')) yield full;
  }
}
function assistantText(line) {
  let rec;
  try { rec = JSON.parse(line); } catch { return null; }
  const m = rec?.message ?? rec;
  if (m?.role !== 'assistant') return null;
  const c = m.content;
  if (typeof c === 'string') return c;
  if (!Array.isArray(c)) return null;
  return c.filter((b) => b?.type === 'text').map((b) => b.text).join('\n') || null;
}

let msgs = 0, oldClaims = 0, newClaims = 0, quieted = 0, added = 0;
const samples = [], addedSamples = [];
for (const f of files(root)) {
  let text = '';
  try { text = fs.readFileSync(f, 'utf8'); } catch { continue; }
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    const t = assistantText(line);
    if (!t || !t.trim()) continue;
    msgs++;
    // Only messages with no receipt could ever have been blocked.
    const r = detectReceipt(t, { ignoreExamples: true });
    if (r.hasReceipt || r.hasUnverified) continue;
    const o = oldDetect(t), n = detectClaim(t);
    if (o.claim) oldClaims++;
    if (n.claim) newClaims++;
    if (o.claim && !n.claim) { quieted++; if (samples.length < 12) samples.push(o.sentence.slice(0, 110)); }
    if (!o.claim && n.claim) { added++; if (addedSamples.length < 8) addedSamples.push(n.sentence.slice(0, 110)); }
  }
}
console.log(`assistant messages scanned : ${msgs}`);
console.log(`flagged by old rules       : ${oldClaims}`);
console.log(`flagged by new rules       : ${newClaims}`);
console.log(`no longer flagged          : ${quieted}  (${(quieted / Math.max(1, oldClaims) * 100).toFixed(1)}% of old flags)`);
console.log(`newly flagged              : ${added}`);
console.log('\n-- sentences that no longer trigger a block --');
for (const s of samples) console.log('  ' + s);
if (addedSamples.length) {
  console.log('\n-- newly triggering --');
  for (const s of addedSamples) console.log('  ' + s);
}
