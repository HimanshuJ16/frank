#!/usr/bin/env node
// Every host manifest declares the version by hand. This fails CI when they
// disagree, and on a release tag when none of them match the tag.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SEMVER = /^\d+\.\d+\.\d+$/;

export const VERSION_FILES = [
  'package.json',
  '.claude-plugin/plugin.json',
  '.codex-plugin/plugin.json',
  '.github/plugin/plugin.json',
  '.qoder-plugin/plugin.json',
  '.devin-plugin/plugin.json',
  'gemini-extension.json',
];

export function readVersions() {
  return VERSION_FILES.map((rel) => {
    const raw = fs.readFileSync(path.join(root, rel), 'utf8').replace(/^﻿/, '');
    return [rel, JSON.parse(raw).version];
  });
}

export function check(env = process.env) {
  const problems = [];
  const versions = readVersions();
  for (const [rel, v] of versions) {
    if (typeof v !== 'string' || !SEMVER.test(v)) problems.push(`${rel}: version must be X.Y.Z, got ${JSON.stringify(v)}`);
  }
  const distinct = [...new Set(versions.map(([, v]) => v))];
  if (distinct.length > 1) {
    problems.push(`versions disagree:\n${versions.map(([rel, v]) => `  ${v}\t${rel}`).join('\n')}`);
  }
  const shared = distinct.length === 1 ? distinct[0] : null;
  if (shared && env.GITHUB_REF_TYPE === 'tag') {
    const tag = String(env.GITHUB_REF_NAME || '').replace(/^v/, '');
    if (SEMVER.test(tag) && tag !== shared) problems.push(`tag v${tag} does not match version ${shared}`);
  }
  return { shared, problems };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { shared, problems } = check();
  if (problems.length) {
    for (const p of problems) console.error(p);
    process.exit(1);
  }
  console.log(`${VERSION_FILES.length} version files at ${shared}`);
}
