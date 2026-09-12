// Frank for OpenCode.
//
// Appends the ruleset to every chat's system prompt at the active mode,
// persists /frank switches, and registers the slash commands so they work
// when the package comes from npm. There is no Stop-style hook in OpenCode's
// plugin API that hands back the final assistant text, so the receipts gate
// does not run here; the ruleset and the commands do.
//
//   { "plugin": ["@himanshuj16/frank"] }
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getMode, setMode, normalizeMode } from '../../hooks/lib/state.js';
import { rulesText, frameForInjection } from '../../hooks/lib/ruleset.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const commandDir = path.join(here, '..', 'command');
const skillsDir = path.resolve(here, '..', '..', 'skills');

// Frontmatter is one `description:` line; the body is the template.
export function parseCommandFile(file) {
  const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text);
  if (!m) return null;
  const desc = /^description:\s*(.+)$/m.exec(m[1]);
  return { description: desc ? desc[1].trim() : '', template: m[2].trim() };
}

export default async ({ client } = {}) => {
  const log = (message) => {
    try { client?.app?.log({ body: { service: 'frank', level: 'info', message } }); } catch { /* no client */ }
  };

  return {
    config: async (config) => {
      config.command = config.command || {};
      try {
        for (const file of fs.readdirSync(commandDir)) {
          if (!file.endsWith('.md')) continue;
          const parsed = parseCommandFile(path.join(commandDir, file));
          if (parsed) config.command[path.basename(file, '.md')] = parsed;
        }
      } catch { /* no command dir */ }
      config.skills = config.skills || {};
      config.skills.paths = config.skills.paths || [];
      if (!config.skills.paths.includes(skillsDir)) config.skills.paths.push(skillsDir);
    },

    'experimental.chat.system.transform': async (_input, output) => {
      const mode = getMode();
      if (mode === 'off') return;
      const rules = frameForInjection(rulesText(), mode);
      if (!rules) return;
      // Some providers reject a second system entry, so extend the last one.
      if (output.system.length > 0) {
        output.system[output.system.length - 1] += `\n\n${rules}`;
      } else {
        output.system.push(rules);
      }
    },

    // The mode applies from the next message: the transform reads what the
    // command wrote. Same-turn switching would need a shared in-memory store.
    'command.execute.before': async (input) => {
      if (!input || input.command !== 'frank') return;
      const mode = normalizeMode(String(input.arguments || '').trim());
      if (!mode) return;
      if (setMode(mode)) log(`frank ${mode}`);
    },
  };
};
