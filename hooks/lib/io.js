// stdin/stdout plumbing for hooks. Rule 4 of the brief: never block real work.
// Any failure in here exits 0 with no output.
import fs from 'node:fs';
import { debug } from './state.js';

export function readInput() {
  try {
    if (process.stdin.isTTY) return {};
    const raw = fs.readFileSync(0, 'utf8');
    if (!raw.trim()) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function emit(payload) {
  try {
    if (payload) process.stdout.write(`${JSON.stringify(payload)}\n`);
  } catch { /* stdout closed */ }
  process.exit(0);
}

export function quiet() {
  process.exit(0);
}

/** Wraps a hook body so a thrown error is silence, not a broken session. */
export async function run(name, fn) {
  try {
    const input = readInput();
    debug(`${name}:in`, { event: input.hook_event_name, session: input.session_id });
    const out = await fn(input);
    if (out) {
      debug(`${name}:out`, { out });
      emit(out);
    }
    quiet();
  } catch (err) {
    debug(`${name}:error`, { message: String(err && err.message) });
    quiet();
  }
}
