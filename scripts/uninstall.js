#!/usr/bin/env node
// Removes the state Frank wrote outside the plugin directory.
// Run with --yes to skip the dry run.
import fs from 'node:fs';
import { frankHome } from '../hooks/lib/paths.js';

const home = frankHome();
const confirmed = process.argv.includes('--yes');

if (!fs.existsSync(home)) {
  console.log(`nothing to remove: ${home} does not exist`);
  process.exit(0);
}

const entries = fs.readdirSync(home);
console.log(`${home}`);
for (const entry of entries) console.log(`  ${entry}`);

if (!confirmed) {
  console.log('\ndry run. re-run with --yes to delete the directory above.');
  console.log('removing the plugin itself: /plugin uninstall frank');
  process.exit(0);
}

try {
  fs.rmSync(home, { recursive: true, force: true });
  console.log(`\nremoved ${home}`);
  console.log('the plugin itself: /plugin uninstall frank');
} catch (err) {
  console.error(`could not remove ${home}: ${err.message}`);
  process.exit(1);
}
