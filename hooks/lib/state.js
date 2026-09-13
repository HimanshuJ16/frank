// Mode + per-session state. Every function fails open: on any error it returns a
// safe default and never throws, because a hook that throws is a hook that blocks work.
import fs from 'node:fs';
import path from 'node:path';
import {
  CONFIG_FILE, STATE_FILE, STATS_FILE, LOG_FILE, SESSION_DIR, sessionFile, frankHome,
} from './paths.js';

export const MODES = ['off', 'lite', 'full', 'ultra'];
export const DEFAULT_MODE = 'full';

/** Blocks the gate is allowed to issue per turn, by mode. */
export const MAX_BLOCKS = { off: 0, lite: 0, full: 1, ultra: 2 };

export function readJson(file, fallback) {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const val = JSON.parse(raw);
    return val && typeof val === 'object' ? val : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(file, value) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
    fs.renameSync(tmp, file);
    return true;
  } catch {
    return false;
  }
}

export function normalizeMode(value) {
  if (typeof value !== 'string') return null;
  const m = value.trim().toLowerCase();
  return MODES.includes(m) ? m : null;
}

/**
 * Where the mode comes from, first match wins:
 *   FRANK_MODE                  hard override for one process
 *   state.json                  a /frank switch, until /frank default clears it
 *   CLAUDE_PLUGIN_OPTION_MODE   the plugin's Mode setting in Claude Code
 *   FRANK_DEFAULT_MODE          environment default
 *   config.json                 ~/.config/frank/config.json {"mode": ...}
 *   "full"
 */
export function resolveMode() {
  const candidates = [
    ['FRANK_MODE', normalizeMode(process.env.FRANK_MODE)],
    ['/frank', normalizeMode(readJson(STATE_FILE(), {}).mode)],
    ['plugin setting', normalizeMode(process.env.CLAUDE_PLUGIN_OPTION_MODE)],
    ['FRANK_DEFAULT_MODE', normalizeMode(process.env.FRANK_DEFAULT_MODE)],
    ['config.json', normalizeMode(readJson(CONFIG_FILE(), {}).mode)],
  ];
  for (const [source, mode] of candidates) if (mode) return { mode, source };
  return { mode: DEFAULT_MODE, source: 'default' };
}

export function getMode() {
  return resolveMode().mode;
}

export function setMode(value) {
  const mode = normalizeMode(value);
  if (!mode) return null;
  const state = readJson(STATE_FILE(), {});
  state.mode = mode;
  state.updated = new Date().toISOString();
  return writeJson(STATE_FILE(), state) ? mode : null;
}

/** Drop the /frank override so the configured default applies again. */
export function clearMode() {
  const state = readJson(STATE_FILE(), {});
  if (!('mode' in state)) return true;
  delete state.mode;
  state.updated = new Date().toISOString();
  return writeJson(STATE_FILE(), state);
}

export function getConfig() {
  return readJson(CONFIG_FILE(), {});
}

// ---------------------------------------------------------------- session ledger

export function emptySession() {
  return { lastEditTs: 0, evidence: [], blocks: {}, openers: 0 };
}

export function readSession(id) {
  const s = readJson(sessionFile(id), null);
  if (!s) return emptySession();
  return {
    lastEditTs: Number(s.lastEditTs) || 0,
    evidence: Array.isArray(s.evidence) ? s.evidence : [],
    blocks: s.blocks && typeof s.blocks === 'object' ? s.blocks : {},
    openers: Number(s.openers) || 0,
  };
}

export function writeSession(id, session) {
  // Keep the ledger bounded; only the tail matters to the gate.
  const trimmed = { ...session, evidence: session.evidence.slice(-60) };
  return writeJson(sessionFile(id), trimmed);
}

export function updateSession(id, fn) {
  const session = readSession(id);
  const next = fn(session) || session;
  writeSession(id, next);
  return next;
}

/** Delete session files untouched for `days`. Best effort, never throws. */
export function pruneSessions(days = 7) {
  try {
    const dir = SESSION_DIR();
    const cutoff = Date.now() - days * 86400000;
    for (const name of fs.readdirSync(dir)) {
      const file = path.join(dir, name);
      try {
        if (fs.statSync(file).mtimeMs < cutoff) fs.unlinkSync(file);
      } catch { /* ignore one bad file */ }
    }
  } catch { /* no dir yet */ }
}

// ---------------------------------------------------------------- stats

export function bumpStats(counters) {
  try {
    const stats = readJson(STATS_FILE(), {});
    const lifetime = stats.lifetime && typeof stats.lifetime === 'object' ? stats.lifetime : {};
    for (const [key, delta] of Object.entries(counters)) {
      lifetime[key] = (Number(lifetime[key]) || 0) + delta;
    }
    stats.lifetime = lifetime;
    stats.since = stats.since || new Date().toISOString();
    writeJson(STATS_FILE(), stats);
    return stats;
  } catch {
    return null;
  }
}

export function readStats() {
  return readJson(STATS_FILE(), { lifetime: {} });
}

// ---------------------------------------------------------------- debug log

export function debug(event, data) {
  if (process.env.FRANK_DEBUG !== '1') return;
  try {
    fs.mkdirSync(frankHome(), { recursive: true });
    fs.appendFileSync(LOG_FILE(), `${JSON.stringify({ ts: Date.now(), event, ...data })}\n`);
  } catch { /* debug logging must never matter */ }
}
