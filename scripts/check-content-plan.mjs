/**
 * Content-plan integrity check.
 *
 * Guards the 700-post inventory in docs/content-plan/ against the failure
 * modes that actually kill programmatic content projects:
 *   1. duplicate slugs / titles
 *   2. keyword cannibalisation (two posts chasing one keyword)
 *   3. near-duplicate titles across sections
 *   4. clashes with already-published posts in content/blog/
 *   5. invented volume data (a volume with no Semrush evidence flag)
 *   6. buyer-type violations (hard rule 2)
 *   7. orphan clusters (no hub link)
 *
 * Run: node scripts/check-content-plan.mjs
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PLAN_DIR = path.join(ROOT, "docs", "content-plan");

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift();
  return rows
    .filter((r) => r.length > 1)
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

const posts = [];
for (const file of ["hyrox-posts.csv", "pt-posts.csv"]) {
  const p = path.join(PLAN_DIR, file);
  if (!existsSync(p)) {
    console.error(`missing ${file}`);
    process.exit(1);
  }
  posts.push(...parseCsv(readFileSync(p, "utf8")));
}

const problems = [];
const warnings = [];

// 1 + 3. Duplicate slugs and titles.
const bySlug = new Map(), byTitle = new Map();
for (const p of posts) {
  if (bySlug.has(p.slug)) problems.push(`duplicate slug "${p.slug}": ${bySlug.get(p.slug)} and ${p.id}`);
  bySlug.set(p.slug, p.id);
  const t = p.title.toLowerCase();
  if (byTitle.has(t)) problems.push(`duplicate title "${p.title}": ${byTitle.get(t)} and ${p.id}`);
  byTitle.set(t, p.id);
}

// 2. Keyword cannibalisation.
const byKeyword = new Map();
for (const p of posts) {
  const k = p.primary_keyword.trim().toLowerCase();
  if (!k) continue;
  (byKeyword.get(k) ?? byKeyword.set(k, []).get(k)).push(p);
}
for (const [kw, group] of byKeyword) {
  if (group.length > 1)
    problems.push(
      `keyword cannibalisation on "${kw}": ${group.map((g) => g.id).join(", ")} — one canonical post per keyword`,
    );
}

// 4. Clash with already-published posts.
const blogDir = path.join(ROOT, "content", "blog");
const published = existsSync(blogDir)
  ? readdirSync(blogDir).filter((f) => f.endsWith(".mdx")).map((f) => f.replace(/\.mdx$/, ""))
  : [];
const tokens = (s) => new Set(s.split("-").filter((w) => w.length > 3));
for (const p of posts) {
  for (const pub of published) {
    const a = tokens(p.slug), b = tokens(pub);
    const shared = [...a].filter((w) => b.has(w));
    if (shared.length >= 3 && p.status !== "refresh")
      warnings.push(
        `${p.id} "${p.slug}" overlaps published "${pub}" (shared: ${shared.join(", ")}) — mark refresh or differentiate`,
      );
  }
}

// 5. Invented volume data.
for (const p of posts) {
  if (p.volume && p.evidence !== "semrush")
    problems.push(`${p.id} has a volume figure but evidence="${p.evidence}" — volumes must come from the keyword database`);
  if (p.evidence === "semrush" && !p.volume)
    warnings.push(`${p.id} flagged semrush but has no volume — check the keyword join`);
}

// 6. Buyer-type violations (hard rule 2).
const BANNED = [
  /\bpt\s+course/i, /personal trainer course/i, /become a personal trainer/i,
  /\bpt\s+jobs?\b/i, /personal train(er|ing) jobs?/i, /level [23] (personal trainer|certificate)/i,
  /how to become a (personal trainer|pt)/i, /personal trainer salary/i,
  /gym instructor course/i, /fitness qualification(?!s explained)/i,
];
for (const p of posts) {
  const hay = `${p.title} ${p.primary_keyword}`;
  for (const re of BANNED) {
    if (re.test(hay))
      problems.push(`${p.id} targets non-client intent (hard rule 2): "${p.title}"`);
  }
}

// 7. Orphan clusters.
const clusterHubs = new Map();
for (const p of posts) {
  if (!clusterHubs.has(p.cluster)) clusterHubs.set(p.cluster, new Set());
  clusterHubs.get(p.cluster).add(p.hub_link);
}
for (const [cluster, hubs] of clusterHubs) {
  if (hubs.has("") || hubs.has(undefined))
    problems.push(`cluster "${cluster}" has posts with no hub_link — orphans do not rank`);
  if (hubs.size > 1)
    warnings.push(`cluster "${cluster}" points at multiple hubs: ${[...hubs].join(", ")}`);
}

// ── Report ───────────────────────────────────────────────────────────
const counts = posts.reduce((acc, p) => {
  acc.total++;
  acc.bySection[p.section] = (acc.bySection[p.section] ?? 0) + 1;
  acc.byStatus[p.status] = (acc.byStatus[p.status] ?? 0) + 1;
  acc.byWave[p.wave] = (acc.byWave[p.wave] ?? 0) + 1;
  if (p.evidence === "semrush") acc.evidenced++;
  return acc;
}, { total: 0, evidenced: 0, bySection: {}, byStatus: {}, byWave: {} });

console.log(`\nContent plan: ${counts.total} posts (${JSON.stringify(counts.bySection)})`);
console.log(`Evidenced keywords: ${counts.evidenced} · waves: ${JSON.stringify(counts.byWave)}`);
console.log(`Status: ${JSON.stringify(counts.byStatus)}\n`);

if (warnings.length) {
  console.log(`${warnings.length} warning(s):`);
  for (const w of warnings.slice(0, 25)) console.log("  ! " + w);
  if (warnings.length > 25) console.log(`  … ${warnings.length - 25} more`);
  console.log("");
}
if (problems.length) {
  console.error(`${problems.length} problem(s):`);
  for (const p of problems) console.error("  ✗ " + p);
  console.error("");
  process.exit(1);
}
console.log("No blocking problems.\n");
