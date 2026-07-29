/**
 * Editorial proofing pass for blog MDX.
 *
 * Catches the things that are easy to get wrong at volume and embarrassing
 * in public: voice slips, AI tells, missing metadata, absent CTAs, unsourced
 * statistics, and posts that are pure text when they should carry a chart or
 * a calculator.
 *
 * This does NOT replace a human read. It clears the mechanical faults so the
 * human read is spent on voice and accuracy.
 *
 * Run: node scripts/proof-posts.mjs [slug]
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const DIR = path.join(process.cwd(), "content", "blog");
const only = process.argv[2];

// Phrases that do not sound like Ben. Mostly AI-house-style and marketing filler.
const VOICE_FLAGS = [
  [/\bdelve\b/i, "'delve' — AI tell"],
  [/\bunlock (your|the)\b/i, "'unlock your…' — marketing filler"],
  [/\bgame[- ]?chang(er|ing)\b/i, "'game-changer' — hype"],
  [/\bin today's (fast-paced|modern)\b/i, "'in today's fast-paced…' — AI opener"],
  [/\bwhether you're a .{3,30} or a\b/i, "'whether you're an X or a Y' — AI construction"],
  [/\blet's dive (in|into)\b/i, "'let's dive in' — AI filler"],
  [/\bit's important to note\b/i, "'it's important to note' — filler"],
  [/\bwhen it comes to\b/i, "'when it comes to' — filler"],
  [/\bharness the power\b/i, "'harness the power' — hype"],
  [/\btake your .{3,25} to the next level\b/i, "'to the next level' — hype"],
  [/\bembark on\b/i, "'embark on' — overwrought"],
  [/\bthat being said\b/i, "'that being said' — filler"],
  [/\bat the end of the day\b/i, "'at the end of the day' — filler"],
  [/\brevolutionar(y|ise)\b/i, "'revolutionary' — hype"],
  [/\bcutting[- ]edge\b/i, "'cutting-edge' — hype"],
  [/\bplethora\b/i, "'plethora' — AI vocabulary"],
  [/\bmyriad\b/i, "'myriad' — AI vocabulary"],
  [/\btestament to\b/i, "'testament to' — AI construction"],
  [/\bnavigate the world of\b/i, "'navigate the world of' — AI construction"],
  [/—/, "em dash — house style is a comma, full stop, or spaced hyphen"],
];

// American spellings that should be British.
const SPELLING = [
  [/\bcolor(s|ed|ing)?\b/i, "color → colour"],
  [/\bfavor(s|ed|ite|ites)?\b/i, "favor → favour"],
  [/\bcenter(s|ed)?\b/i, "center → centre"],
  [/\bmeter(s)?\b/i, "meter → metre (unless a measuring device)"],
  [/\bpractice(s|d)?\b(?=[^.]*\b(to|will|should)\b)/i, "check practice/practise"],
  [/\banaly(z|zed|zing|ze)\b/i, "analyze → analyse"],
  [/\borganiz(e|ed|ing|ation)\b/i, "organize → organise"],
  [/\bspecializ(e|ed|ing)\b/i, "specialize → specialise"],
  [/\btraveled\b|\btraveling\b/i, "traveled → travelled"],
  [/\bfiber\b/i, "fiber → fibre"],
  [/\bprogram\b(?![a-z])/i, "program → programme (unless software)"],
];

// A number presented as fact needs a source nearby or an explicit hedge.
const STAT_PATTERN =
  /\b\d{1,3}(?:\.\d+)?\s?(?:%|per cent|percent)\b|\b(?:average|median|mean)\s+(?:of\s+)?\d/gi;
const HEDGE =
  /(coaching (judgement|benchmark)|in my experience|roughly|typically|about|around|not a (dataset|statistic)|planning estimate|source:|varies)/i;

const CTA_HINTS = [
  /plan maker/i, /free assessment/i, /book a call/i, /coaching/i,
  /the hub/i, /assessment/i, /get in touch/i, /work with/i,
];

const RICH = /<(BarChart|StatTile|Meter|Breakdown|Checklist|RaceCostCalculator|PaceCalculator|PtCostCalculator|ComparisonTable|RaceAnalytics|KeyTakeaways|Callout|StatGrid|SledCalculator|Leaderboard)/;

const files = readdirSync(DIR)
  .filter((f) => f.endsWith(".mdx"))
  .filter((f) => !only || f.includes(only));

let totalIssues = 0;
const summary = [];

for (const file of files) {
  const raw = readFileSync(path.join(DIR, file), "utf8");
  const fmEnd = raw.indexOf("\n---", 4);
  const fm = raw.slice(0, fmEnd);
  const body = raw.slice(fmEnd + 4);
  const issues = [];

  // ── Metadata ──
  const need = ["title", "slug", "excerpt", "category", "publishedAt", "author", "heroImage", "heroAlt", "seoTitle", "seoDescription"];
  for (const k of need) {
    if (!new RegExp(`^${k}:`, "m").test(fm)) issues.push(`missing frontmatter: ${k}`);
  }
  const seoT = fm.match(/^seoTitle:\s*"(.*)"/m)?.[1];
  if (seoT && seoT.length > 60) issues.push(`seoTitle ${seoT.length} chars (aim ≤60)`);
  const seoD = fm.match(/^seoDescription:\s*"(.*)"/m)?.[1];
  if (seoD && (seoD.length < 120 || seoD.length > 160))
    issues.push(`seoDescription ${seoD.length} chars (aim 120–160)`);
  const alt = fm.match(/^heroAlt:\s*"(.*)"/m)?.[1];
  if (alt !== undefined && alt.trim().length < 15) issues.push("heroAlt too short to be useful");
  if (!/^faqs:/m.test(fm)) issues.push("no FAQs — loses the FAQPage schema and the AI-citation surface");

  // ── Voice ──
  for (const [re, msg] of VOICE_FLAGS) {
    const m = body.match(re);
    if (m) issues.push(`voice: ${msg} (“${m[0].trim()}”)`);
  }
  for (const [re, msg] of SPELLING) {
    const m = body.match(re);
    if (m) issues.push(`spelling: ${msg} (“${m[0].trim()}”)`);
  }

  // ── Unsourced statistics (hard rule 1) ──
  const stats = body.match(STAT_PATTERN) || [];
  for (const s of stats) {
    const i = body.indexOf(s);
    const around = body.slice(Math.max(0, i - 320), i + 320);
    if (!HEDGE.test(around)) {
      issues.push(`unsourced figure “${s.trim()}” — cite a source or mark it as judgement`);
    }
  }

  // ── Structure ──
  const h2s = (body.match(/^## /gm) || []).length;
  if (h2s < 3) issues.push(`only ${h2s} H2 sections — thin structure`);
  const words = body.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  if (words < 700) issues.push(`${words} words — short for a guide`);
  if (!RICH.test(body)) issues.push("no chart, callout or calculator — this is a wall of text");
  if (!CTA_HINTS.some((re) => re.test(body))) issues.push("no call to action found");

  // First 60 words should answer, not preamble.
  const firstPara = body.split(/\n\n/).find((p) => p.trim() && !p.trim().startsWith("<") && !p.trim().startsWith("#"));
  if (firstPara && firstPara.split(/\s+/).length > 80) {
    issues.push("opening paragraph is long — lead with the answer");
  }

  if (issues.length) {
    totalIssues += issues.length;
    summary.push({ file, issues });
  }
}

if (!summary.length) {
  console.log(`\nProofed ${files.length} post(s). Nothing flagged.\n`);
  process.exit(0);
}

console.log(`\nProofed ${files.length} post(s) — ${totalIssues} flag(s) across ${summary.length} file(s).\n`);
for (const { file, issues } of summary) {
  console.log(`  ${file}`);
  for (const i of issues) console.log(`    · ${i}`);
  console.log("");
}
console.log("Flags are prompts for a human read, not automatic failures.\n");
