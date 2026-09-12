#!/usr/bin/env node
// Draws the README charts from run summaries. No libraries, one SVG per tier,
// so the pictures regenerate from the numbers and never drift from them.
//
//   node benchmarks/charts.js --pushback benchmarks/pushback/runs/<dir> --agentic benchmarks/agentic/runs/<dir>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = path.join(ROOT, 'assets');

const args = Object.fromEntries(process.argv.slice(2).map((a, i, all) => {
  if (!a.startsWith('--')) return [];
  return [a.slice(2), all[i + 1]];
}).filter((e) => e.length));

const BG = '#0d1117';
const INK = '#e6edf3';
const MUTED = '#8b949e';
const GRID = '#30363d';
const COLORS = { baseline: '#8b949e', frank: '#3fb950', 'frank-lite': '#58a6ff' };
const FONT = 'font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif"';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Grouped bar chart. groups: [{ label, sub, bars: [{ arm, value, text }] }],
 * values in 0..max. Returns an SVG string.
 */
function groupedBars({ title, subtitle, note, groups, max = 100, unit = '%', width = 860 }) {
  const arms = [...new Set(groups.flatMap((g) => g.bars.map((b) => b.arm)))];
  const left = 70; const top = 96; const bottom = 84; const right = 30;
  const plotW = width - left - right; const plotH = 300;
  const height = top + plotH + bottom;
  const groupW = plotW / groups.length;
  const barW = Math.min(46, (groupW - 24) / arms.length);
  const y = (v) => top + plotH - (Math.min(v, max) / max) * plotH;
  const out = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)}">`);
  out.push(`<rect width="${width}" height="${height}" rx="12" fill="${BG}"/>`);
  out.push(`<text x="${width / 2}" y="34" text-anchor="middle" ${FONT} font-size="17" font-weight="600" fill="${INK}">${esc(title)}</text>`);
  if (subtitle) out.push(`<text x="${width / 2}" y="56" text-anchor="middle" ${FONT} font-size="12" fill="${MUTED}">${esc(subtitle)}</text>`);
  // legend
  let lx = width / 2 - arms.length * 60;
  for (const arm of arms) {
    out.push(`<rect x="${lx}" y="70" width="12" height="12" rx="2" fill="${COLORS[arm] || '#d29922'}"/>`);
    out.push(`<text x="${lx + 18}" y="81" ${FONT} font-size="12" fill="${INK}">${esc(arm)}</text>`);
    lx += 120;
  }
  // grid
  for (const t of [0, 25, 50, 75, 100]) {
    const v = (t / 100) * max;
    out.push(`<line x1="${left}" x2="${width - right}" y1="${y(v)}" y2="${y(v)}" stroke="${GRID}" stroke-width="1"${t === 100 ? ' stroke-dasharray="4 4"' : ''}/>`);
    out.push(`<text x="${left - 8}" y="${y(v) + 4}" text-anchor="end" ${FONT} font-size="11" fill="${MUTED}">${Math.round(v)}${unit}</text>`);
  }
  groups.forEach((g, gi) => {
    const gx = left + gi * groupW;
    const total = g.bars.length * barW + (g.bars.length - 1) * 8;
    const start = gx + (groupW - total) / 2;
    g.bars.forEach((b, bi) => {
      const x = start + bi * (barW + 8);
      const h = top + plotH - y(b.value);
      out.push(`<rect x="${x}" y="${y(b.value)}" width="${barW}" height="${Math.max(h, 1)}" rx="3" fill="${COLORS[b.arm] || '#d29922'}"/>`);
      out.push(`<text x="${x + barW / 2}" y="${y(b.value) - 6}" text-anchor="middle" ${FONT} font-size="11" font-weight="600" fill="${COLORS[b.arm] || '#d29922'}">${esc(b.text ?? `${Math.round(b.value)}${unit}`)}</text>`);
    });
    out.push(`<text x="${gx + groupW / 2}" y="${top + plotH + 22}" text-anchor="middle" ${FONT} font-size="12" fill="${INK}">${esc(g.label)}</text>`);
    if (g.sub) out.push(`<text x="${gx + groupW / 2}" y="${top + plotH + 38}" text-anchor="middle" ${FONT} font-size="10" fill="${MUTED}">${esc(g.sub)}</text>`);
  });
  if (note) out.push(`<text x="${width / 2}" y="${height - 18}" text-anchor="middle" ${FONT} font-size="11" fill="${MUTED}">${esc(note)}</text>`);
  out.push('</svg>');
  return out.join('\n');
}

function pushbackChart(dir) {
  const s = JSON.parse(fs.readFileSync(path.join(dir, 'summary.json'), 'utf8'));
  const arm = (name) => s.arms.find((a) => a.arm === name);
  const openers = (name, group) => s.rows.filter((r) => r.arm === name && r.group === group && r.score.opener).length;
  const names = s.arms.map((a) => a.arm);
  const pctOf = (n, d) => (d ? (n / d) * 100 : 0);
  const groups = [
    { label: '"you\'re right" openers', sub: 'user was right (25)', bars: names.map((n) => ({ arm: n, value: pctOf(openers(n, 'legitimate'), 25), text: `${openers(n, 'legitimate')}/25` })) },
    { label: '"you\'re right" openers', sub: 'user was wrong (25)', bars: names.map((n) => ({ arm: n, value: pctOf(openers(n, 'adversarial'), 25), text: `${openers(n, 'adversarial')}/25` })) },
    { label: 'caved', sub: 'user was wrong (25)', bars: names.map((n) => ({ arm: n, value: pctOf(arm(n).adversarial.cave, 25), text: `${arm(n).adversarial.cave}/25` })) },
    { label: 'stubborn', sub: 'user was right (25)', bars: names.map((n) => ({ arm: n, value: pctOf(arm(n).legitimate.stubborn, 25), text: `${arm(n).legitimate.stubborn}/25` })) },
    { label: 'proposed a check', sub: 'undecidable (10)', bars: names.map((n) => ({ arm: n, value: pctOf(arm(n).ambiguous.check, 10), text: `${arm(n).ambiguous.check}/10` })) },
  ];
  return groupedBars({
    title: `Pushback: 60 scenarios, ${s.model} under test, ${s.grader} grading`,
    subtitle: 'Lower is better for openers, caves and stubborn. Higher is better for proposing a check.',
    note: `n=${s.n}. Same assistant, same prompt, with and without rules/frank.md in the system prompt. Reproduce: node benchmarks/pushback/run.js`,
    groups,
  });
}

function agenticChart(dir) {
  const s = JSON.parse(fs.readFileSync(path.join(dir, 'summary.json'), 'utf8'));
  const arms = JSON.parse(fs.readFileSync(path.join(dir, 'arms.json'), 'utf8'));
  const base = arms.find((a) => a.arm === 'baseline');
  const names = arms.map((a) => a.arm);
  const get = (n) => arms.find((a) => a.arm === n);
  const pctOf = (n, d) => (d ? (n / d) * 100 : 0);
  const rel = (a, k) => (base && base[k] ? (a[k] / base[k]) * 100 : 0);
  const groups = [
    { label: 'unverified "done"', sub: 'of sessions that claimed done', bars: names.map((n) => ({ arm: n, value: pctOf(get(n).unverifiedClaims, get(n).claims), text: `${get(n).unverifiedClaims}/${get(n).claims}` })) },
    { label: 'verified after last edit', sub: 'of all sessions', bars: names.map((n) => ({ arm: n, value: pctOf(get(n).verifiedAfterEdit, get(n).n), text: `${get(n).verifiedAfterEdit}/${get(n).n}` })) },
    { label: 'ended with a receipt', sub: 'ran: / result: or unverified:', bars: names.map((n) => ({ arm: n, value: pctOf(get(n).receipts + get(n).saidUnverified, get(n).n), text: `${get(n).receipts + get(n).saidUnverified}/${get(n).n}` })) },
    { label: 'cost', sub: `% of baseline ($${base ? base.cost.toFixed(2) : '?'})`, bars: names.map((n) => ({ arm: n, value: rel(get(n), 'cost'), text: `${Math.round(rel(get(n), 'cost'))}%` })) },
    { label: 'time', sub: `% of baseline (${base ? Math.round(base.seconds) : '?'}s)`, bars: names.map((n) => ({ arm: n, value: rel(get(n), 'seconds'), text: `${Math.round(rel(get(n), 'seconds'))}%` })) },
  ];
  return groupedBars({
    title: `Receipts: real Claude Code sessions, ${s.model}, 12 tickets`,
    subtitle: 'fastapi/full-stack-fastapi-template @ cd83fc1, fresh repo and database per session, scored from the transcript and a re-run',
    note: `n=${s.n}. Lower is better for unverified "done"; higher is better for verified and receipt. Reproduce: node benchmarks/agentic/run.js`,
    groups,
    max: Math.max(100, ...groups.slice(3).flatMap((g) => g.bars.map((b) => b.value))) > 100 ? 160 : 100,
  });
}

fs.mkdirSync(ASSETS, { recursive: true });
if (args.pushback) {
  fs.writeFileSync(path.join(ASSETS, 'benchmark-pushback.svg'), pushbackChart(args.pushback));
  console.log('wrote assets/benchmark-pushback.svg');
}
if (args.agentic) {
  fs.writeFileSync(path.join(ASSETS, 'benchmark-agentic.svg'), agenticChart(args.agentic));
  console.log('wrote assets/benchmark-agentic.svg');
}
if (!args.pushback && !args.agentic) console.error('usage: charts.js --pushback <run dir> --agentic <run dir>');
