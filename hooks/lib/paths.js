// Where Frank keeps its state. Nothing here throws.
import os from 'node:os';
import path from 'node:path';

export function frankHome() {
  if (process.env.FRANK_HOME) return process.env.FRANK_HOME;
  if (process.platform === 'win32' && process.env.APPDATA) {
    return path.join(process.env.APPDATA, 'frank');
  }
  const xdg = process.env.XDG_CONFIG_HOME;
  if (xdg) return path.join(xdg, 'frank');
  return path.join(os.homedir(), '.config', 'frank');
}

export const CONFIG_FILE = () => path.join(frankHome(), 'config.json');
export const STATE_FILE = () => path.join(frankHome(), 'state.json');
export const STATS_FILE = () => path.join(frankHome(), 'stats.json');
export const LOG_FILE = () => path.join(frankHome(), 'log.jsonl');
export const SESSION_DIR = () => path.join(frankHome(), 'sessions');
export const sessionFile = (id) =>
  path.join(SESSION_DIR(), `${String(id || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_')}.json`);
