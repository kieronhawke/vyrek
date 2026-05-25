#!/usr/bin/env node
/**
 * WCAG 2.1 AA accessibility audit using Playwright + @axe-core/playwright.
 *
 * Audits 8 production routes on https://vyrek.vercel.app and prints a compact
 * per-route table, then saves full results to scripts/a11y-axe/results.json.
 *
 * Run: node scripts/a11y-axe.mjs
 */

import { chromium } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, 'a11y-axe');
const OUT_FILE = join(OUT_DIR, 'results.json');

const BASE = 'https://vyrek.vercel.app';
const ROUTES = [
  '/',
  '/programmes',
  '/quiz',
  '/plan',
  '/partners',
  '/blog',
  '/blog/hyrox-station-weights-explained',
  '/contact',
];

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

const IMPACTS = ['critical', 'serious', 'moderate', 'minor'];

function pad(s, n) {
  s = String(s ?? '');
  if (s.length >= n) return s.slice(0, n);
  return s + ' '.repeat(n - s.length);
}

function impactRank(impact) {
  const idx = IMPACTS.indexOf(impact);
  return idx === -1 ? 99 : idx;
}

async function auditRoute(browser, route) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 vyrek-a11y-audit',
  });
  const page = await context.newPage();
  const url = `${BASE}${route}`;
  let navOk = true;
  let navError = null;
  let status = null;
  try {
    const resp = await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 60_000,
    });
    status = resp ? resp.status() : null;
  } catch (err) {
    navOk = false;
    navError = err.message;
  }

  let axeResults = null;
  let axeError = null;
  if (navOk) {
    try {
      axeResults = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    } catch (err) {
      axeError = err.message;
    }
  }

  await context.close();

  const violations = axeResults?.violations ?? [];
  const counts = { critical: 0, serious: 0, moderate: 0, minor: 0, other: 0 };
  for (const v of violations) {
    if (v.impact && counts[v.impact] != null) counts[v.impact] += 1;
    else counts.other += 1;
  }

  return {
    route,
    url,
    status,
    navOk,
    navError,
    axeError,
    totalViolations: violations.length,
    counts,
    violations: violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      helpUrl: v.helpUrl,
      description: v.description,
      tags: v.tags,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        html: n.html,
        failureSummary: n.failureSummary,
        any: (n.any ?? []).map((c) => ({ id: c.id, message: c.message })),
      })),
    })),
  };
}

function printTable(rows) {
  const header = [
    pad('Route', 46),
    pad('Status', 7),
    pad('Total', 6),
    pad('Crit', 5),
    pad('Serious', 8),
    pad('Mod', 5),
    pad('Minor', 6),
  ].join(' ');
  const sep = '-'.repeat(header.length);
  console.log('\nAccessibility audit — https://vyrek.vercel.app');
  console.log(`Tags: ${TAGS.join(', ')}\n`);
  console.log(header);
  console.log(sep);
  for (const r of rows) {
    console.log(
      [
        pad(r.route, 46),
        pad(r.status ?? (r.navOk ? '?' : 'ERR'), 7),
        pad(r.totalViolations, 6),
        pad(r.counts.critical, 5),
        pad(r.counts.serious, 8),
        pad(r.counts.moderate, 5),
        pad(r.counts.minor, 6),
      ].join(' '),
    );
  }
  console.log(sep);
  const totals = rows.reduce(
    (acc, r) => {
      acc.total += r.totalViolations;
      acc.critical += r.counts.critical;
      acc.serious += r.counts.serious;
      acc.moderate += r.counts.moderate;
      acc.minor += r.counts.minor;
      return acc;
    },
    { total: 0, critical: 0, serious: 0, moderate: 0, minor: 0 },
  );
  console.log(
    [
      pad('TOTAL', 46),
      pad('', 7),
      pad(totals.total, 6),
      pad(totals.critical, 5),
      pad(totals.serious, 8),
      pad(totals.moderate, 5),
      pad(totals.minor, 6),
    ].join(' '),
  );
}

function printTopViolations(rows, n = 10) {
  // Flatten one row per violation, sorted by (impact, node count desc)
  const flat = [];
  for (const r of rows) {
    for (const v of r.violations) {
      flat.push({
        route: r.route,
        id: v.id,
        impact: v.impact,
        help: v.help,
        helpUrl: v.helpUrl,
        nodeCount: v.nodes.length,
        selectors: v.nodes.flatMap((node) => node.target).slice(0, 8),
      });
    }
  }
  flat.sort((a, b) => {
    const r = impactRank(a.impact) - impactRank(b.impact);
    if (r !== 0) return r;
    return b.nodeCount - a.nodeCount;
  });

  console.log(`\nTop ${n} most-impactful violations:`);
  flat.slice(0, n).forEach((v, i) => {
    console.log(
      `\n${i + 1}. [${v.impact ?? '?'}] ${v.id} — ${v.route} (${v.nodeCount} node(s))`,
    );
    console.log(`   ${v.help}`);
    console.log(`   ${v.helpUrl}`);
    console.log(`   selectors:`);
    for (const sel of v.selectors) {
      console.log(`     - ${Array.isArray(sel) ? sel.join(' >> ') : sel}`);
    }
  });
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const rows = [];
  for (const route of ROUTES) {
    process.stdout.write(`Auditing ${route} ... `);
    const t0 = Date.now();
    const row = await auditRoute(browser, route);
    const ms = Date.now() - t0;
    process.stdout.write(
      `${row.totalViolations} violations (${ms}ms)${
        row.navError ? ` [nav error: ${row.navError}]` : ''
      }${row.axeError ? ` [axe error: ${row.axeError}]` : ''}\n`,
    );
    rows.push(row);
  }
  await browser.close();

  printTable(rows);
  printTopViolations(rows, 10);

  const payload = {
    base: BASE,
    generatedAt: new Date().toISOString(),
    tags: TAGS,
    routes: rows,
  };
  await writeFile(OUT_FILE, JSON.stringify(payload, null, 2));
  console.log(`\nFull results written to: ${OUT_FILE}`);
}

main().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
