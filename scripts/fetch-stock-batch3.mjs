#!/usr/bin/env node
// Stage 1.1 image batch — 3 specific slot replacements per user feedback.

import { mkdir, writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

const TMP = "/tmp/vyrek-stock-3";
const OUT = "/Users/kieronhawke/code/vyrek/public/media/images/v2";
await mkdir(TMP, { recursive: true });

const IMAGES = [
  // role                  Pexels ID   intent / alt seed
  ["workout-dated",        6353833,    "Athlete with training notebook / week-planning calendar"],
  ["programme-sub-90-v2",  8533787,    "Male sprinter mid-stride on outdoor track"],
  ["adapt-coaching",       20523354,   "Athlete reviewing performance data with a coach"],
];

const results = [];

for (const [role, id, alt] of IMAGES) {
  const out = `${OUT}/${role}.jpg`;
  if (existsSync(out)) {
    console.log(`  skip ${role}`);
    results.push({ role, pexelsId: id, alt, status: "skipped" });
    continue;
  }
  const url = `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?cs=srgb&w=1920`;
  try {
    execSync(`curl -sLfo "${out}" "${url}"`, { stdio: "pipe" });
  } catch (e) {
    console.log(`  ✗ fetch ${role} (${id}): ${e.message.slice(0, 80)}`);
    continue;
  }
  execSync(`sips -Z 1920 -s formatOptions 82 "${out}" --out "${out}" >/dev/null 2>&1`);
  const bytes = execSync(`stat -f%z "${out}"`).toString().trim();
  console.log(`  ✓ ${role}  (id=${id}, ${(bytes / 1024).toFixed(0)} KB)`);
  results.push({ role, pexelsId: id, bytes: Number(bytes), alt });
}

await writeFile(
  `${OUT}/_attribution-batch3.json`,
  JSON.stringify({ source: "pexels.com", licence: "Pexels License", fetched: new Date().toISOString(), photos: results }, null, 2),
);

console.log(`\nDownloaded: ${results.filter((r) => r.bytes).length}/${IMAGES.length}`);
