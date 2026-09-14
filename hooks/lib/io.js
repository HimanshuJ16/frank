// stdin/stdout plumbing shared by every hook. The contract is simple: a hook
// that fails goes quiet. It never exits non-zero, never prints garbage, and
// never waits on stdin longer than a second.
import { debug } from './state.js';

// On Windows, Claude Code can run a shell-form hook through a PowerShell
// wrapper that swallows the piped JSON, so stdin 'end' never fires. A blocking
// read would then sit there until the hook timeout and the output would be
// thrown away. Collect what arrives, and after a short grace period go with
// that (ponytail hit the same thing, their issue #443).
const STDIN_GRACE_MS = 1000;
// Hooks receive small JSON event objects. Refuse an unexpectedly huge payload
// rather than keeping it in memory; malformed input already fails open.
const MAX_INPUT_BYTES = 1024 * 1024;

export function parseInput(raw) {
  try {
    const text = String(raw || '').replace(/^\uFEFF/, '').trim();
    if (!text) return {};
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function readInput() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      resolve({});
      return;
    }
    let raw = '';
    let bytes = 0;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve(parseInput(raw));
    };
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      bytes += Buffer.byteLength(chunk);
      if (bytes > MAX_INPUT_BYTES) {
        raw = '';
        finish();
        return;
      }
      raw += chunk;
    });
    process.stdin.on('end', finish);
    process.stdin.on('error', finish);
    setTimeout(finish, STDIN_GRACE_MS).unref();
  });
}

export function emit(payload) {
  try {
    if (payload) process.stdout.write(`${JSON.stringify(payload)}\n`);
  } catch {
    // stdout already closed; nothing to do
  }
  process.exit(0);
}

export function quiet() {
  process.exit(0);
}

export async function run(name, fn) {
  try {
    const input = await readInput();
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
