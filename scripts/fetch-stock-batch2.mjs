#!/usr/bin/env node
// Batch 2 of stock imagery — per user feedback (specific slot dislikes).
// 6 new files into public/media/images/v2/

import { mkdir, writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

const TMP = "/tmp/vyrek-stock-2";
const OUT = "/Users/kieronhawke/code/vyrek/public/media/images/v2";
await mkdir(TMP, { recursive: true });

const IMAGES = [
  // role                  Pexels ID   intent / alt seed
  ["hero-cinematic",       1552102,    "Cinematic sled push, low-light Hyrox-style hero"],
  ["station-fresh",        34794695,   "Athlete mid wall-ball rep, race-pace effort"],
  ["metrics-fresh",        4482934,    "Athlete logging training data on phone + watch"],
  ["honesty-fresh",        9602280,    "Athlete working through a heavy set, candid"],
  ["coach-2",              8611981,    "Female coach in a gym, smiling, looking at camera"],
  ["coach-3",              5878697,    "Black fitness coach portrait, looking at camera"],
];

const results = [];

for (const [role, id, alt] of IMAGES) {
  const out = `${OUT}/${role}.jpg`;
  if (existsSync(out)) {
    console.log(`  skip ${role} (exists)`);
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
  `${OUT}/_attribution-batch2.json`,
  JSON.stringify(
    { source: "pexels.com", licence: "Pexels License", fetched: new Date().toISOString(), photos: results },
    null,
    2,
  ),
);

console.log(`\nDownloaded: ${results.filter((r) => r.bytes).length}/${IMAGES.length}`);
