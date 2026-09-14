// Detectors for completion claims, receipt blocks and sycophantic openers.
// Pure functions, no I/O. A false positive costs the user a blocked turn; a miss
// only leaves the status quo. So every rule here is biased toward NOT matching.

/** Text we must never match inside: code fences, inline code, quoted user text. */
export function sanitize(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/[\u2018\u2019]/g, "'")     // curly apostrophes: you're
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/```[\s\S]*?(?:```|$)/g, ' ')      // fenced code
    .replace(/~~~[\s\S]*?(?:~~~|$)/g, ' ')
    .replace(/`[^`\n]*`/g, ' ')                  // inline code
    .replace(/^[ \t]*>.*$/gm, ' ')               // blockquote (quoted user text)
    .replace(/^[ \t]{4,}\S.*$/gm, ' ');          // indented code block
}

// A past-tense verb of work is a claim when the agent is its subject: at the
// head of a sentence ("Fixed the off-by-one"), after I/we, or passive with no
// location. A bare \bimplemented\b also fires on "the React team implemented
// this in v18" and "the promise resolved with undefined" (ADR-029).
const WORK = "implemented|resolved|finished|fixed";
const COMPLETION = [
  /\bdone\b/i,
  /\ball set\b/i,
  // (?!-) keeps the adjective out: "a fixed-size buffer", "fixed-width header".
  new RegExp(String.raw`^[\s*\-–—]*(?:${WORK})\b(?!-)`, 'i'),
  new RegExp(String.raw`\b(?:i|we)(?:'ve| have|'d)?\s+(?:just\s+|now\s+|already\s+)?(?:${WORK})\b(?!-)`, 'i'),
  new RegExp(String.raw`\b(?:is|are|was|were|'s|'re|has been|have been|had been)\s+(?:now\s+)?(?:${WORK})\b(?!-)`, 'i'),
  /\bworking now\b/i,
  /\bnow works\b/i,
  /\bshould (?:work|be fixed|pass|be working)\b/i,
  /\bready to (?:go|use|ship|merge)\b/i,
];

// "needs to be done", "left to be done", "will be done by the hook": work that
// is outstanding, not work that was finished.
const OUTSTANDING = /\b(?:to be|be|being|gets?|got|getting)\s+done\b/i;
// "I'll tell you when it's done" dates the claim to the future.
const TEMPORAL = /\b(?:when|until|once|after|before|whenever|while)\b/i;

const VERIFICATION = [
  /\b(?:all\s+)?(?:tests?|specs?|suite|checks?|lint|build|ci|everything|they|it|type[- ]?check(?:s|ing)?|tsc)\s+(?:now\s+)?(?:pass|passes|passed|passing)\b/i,
  /\b(?:i\s+)?verified\b/i,
  /\b(?:i\s+)?confirmed\b/i,
  /\bbuilds? (?:successfully|cleanly|fine)\b/i,
  /\bcompiles (?:successfully|cleanly|fine|without errors)\b/i,
  /\b(?:it|this|the code|the project|everything)\s+(?:now\s+)?compiles\b(?!\s+(?:to|into|down))/i,
  /\bno errors\b/i,
  /\btype[- ]?checks? (?:pass|cleanly)\b/i,
];

// Words that, immediately before a match, flip its meaning.
const NEGATION = /\b(?:not|never|n't|without|cannot|can'?t|unable|un(?:verified|tested|confirmed)|fail(?:s|ed|ing)?|didn'?t|doesn'?t|don'?t|haven'?t|hasn'?t|isn'?t|aren'?t|wasn'?t|no|no longer|none|nothing|nobody|still)\b/i;

/** Sentences, roughly. Newlines and list bullets end a sentence too. */
export function sentences(text) {
  return sanitize(text)
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Instructions and conditionals aren't claims: "once done, run X". */
function isConditional(s) {
  return /^(?:once|when|after|if|unless|let me know|tell me|please)\b/i.test(s)
    // An instruction to the reader is not a report: "Check whether the tests pass".
    || /^(?:check|verify|ensure|confirm|make sure|run|try|see)\b/i.test(s);
}

function isQuestion(s) {
  return /\?\s*$/.test(s) || /^(?:do|does|did|is|are|was|were|should|can|could|will|would|have|has|shall)\b/i.test(s);
}

// "Rate limiting is implemented upstream by the gateway" describes code; it
// does not claim to have finished anything. Passive voice plus a location.
const DESCRIPTIVE = /\b(?:is|are|was|were|gets?|being)\s+(?:done|implemented|resolved|handled|fixed|finished)\s+(?:in|by|at|through|via|upstream|inside|within|on|using|with|as|per)\b/i;

/** Negation anywhere in the 45 characters before the match disarms it. */
function negatedBefore(sentence, index) {
  const window = sentence.slice(Math.max(0, index - 45), index);
  return NEGATION.test(window);
}

/**
 * @returns {{claim: boolean, kind: 'completion'|'verification'|null, matched: string|null, sentence: string|null}}
 */
export function detectClaim(text) {
  for (const sentence of sentences(text)) {
    if (isQuestion(sentence) || isConditional(sentence)) continue;
    if (/^\s*(?:unverified|ran|result)\s*:/i.test(sentence)) continue; // receipt lines
    if (DESCRIPTIVE.test(sentence)) continue;
    for (const [kind, patterns] of [['completion', COMPLETION], ['verification', VERIFICATION]]) {
      for (const re of patterns) {
        const m = re.exec(sentence);
        if (!m) continue;
        if (negatedBefore(sentence, m.index)) continue;
        if (/^done$/i.test(m[0].trim())
          && (OUTSTANDING.test(sentence) || TEMPORAL.test(sentence.slice(0, m.index)))) continue;
        return { claim: true, kind, matched: m[0].trim(), sentence };
      }
    }
  }
  return { claim: false, kind: null, matched: null, sentence: null };
}

/**
 * The machine-readable receipt the ruleset asks for:
 *   ran: <command>
 *   result: <summary>
 * or  unverified: <what would verify it>
 */
export function detectReceipt(text, { ignoreExamples = false } = {}) {
  // The benchmark parser reads archived Markdown examples, which may be
  // fenced. The live gate must not treat quoted user text or examples as the
  // agent's receipt, so it opts into the stricter form below.
  const src = ignoreExamples ? sanitize(text) : (typeof text === 'string' ? text : '');
  const ran = [...src.matchAll(/^[ \t>*-]*ran\s*:\s*(.+)$/gim)].map((m) => m[1].trim());
  const result = [...src.matchAll(/^[ \t>*-]*result\s*:\s*(.+)$/gim)].map((m) => m[1].trim());
  const unverified = [...src.matchAll(/^[ \t>*-]*unverified\s*:\s*(.+)$/gim)].map((m) => m[1].trim());
  return {
    hasReceipt: ran.length > 0 && result.length > 0,
    hasUnverified: unverified.length > 0,
    ran,
    result,
    unverified,
  };
}

const OPENERS = [
  /you'?re absolutely right/i,
  /you'?re (?:so |completely |totally |100% )?right/i,
  /you are (?:absolutely )?(?:right|correct)/i,
  /you'?re correct/i,
  /(?:that'?s a )?(?:great|good|excellent|fantastic) (?:question|point|catch|call|observation|idea)/i,
  /good catch/i,
  /i apologi[sz]e for the confusion/i,
  /my apologies for the confusion/i,
  /(?:that'?s|what) (?:an? )?(?:excellent|great|astute) (?:question|point)/i,
];

/**
 * Openers only count when they OPEN. We scan the first non-empty line and the
 * first sentence after it, so "you're right that X, but Y" mid-answer is fine.
 */
export function detectOpener(text) {
  const clean = sanitize(text).trim();
  if (!clean) return { opener: false, matched: null };
  const head = clean.split(/\n\s*\n/)[0].slice(0, 240);
  for (const re of OPENERS) {
    const m = re.exec(head);
    if (!m) continue;
    if (negatedBefore(head, m.index)) continue;
    return { opener: true, matched: m[0].trim() };
  }
  return { opener: false, matched: null };
}
