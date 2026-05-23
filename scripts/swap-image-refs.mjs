#!/usr/bin/env node
// Repoint every reference to the old (massively-deduped) image set to the
// new v2/ stock library. Where multiple roles previously aliased to one
// file, we now map them to distinct unique files.

import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const ROOT = "/Users/kieronhawke/code/vyrek";

// Old path -> new path. Multi-mapping where old role conflated several
// concepts: we lean on context (which file uses it) when needed but the
// simple cases swap 1:1.
const SIMPLE_SWAPS = [
  ["/media/images/programme-first-race.jpg", "/media/images/v2/programme-first-race.jpg"],
  ["/media/images/programme-sub-90.jpg",     "/media/images/v2/programme-sub-90.jpg"],
  ["/media/images/programme-doubles.jpg",    "/media/images/v2/programme-doubles.jpg"],
  ["/media/images/programme-pro.jpg",        "/media/images/v2/programme-pro.jpg"],
  ["/media/images/coach-james-wright.jpg",   "/media/images/v2/coach-james-wright.jpg"],
  ["/media/images/bento-coaches.jpg",        "/media/images/v2/bento-coaches.jpg"],
  ["/media/images/bento-plan.jpg",           "/media/images/v2/bento-plan.jpg"],
  ["/media/images/bento-progress.jpg",       "/media/images/v2/bento-progress.jpg"],
  ["/media/images/testimonial-1.jpg",        "/media/images/v2/testimonial-sarah.jpg"],
  ["/media/images/testimonial-2.jpg",        "/media/images/v2/testimonial-marcus.jpg"],
  ["/media/images/quiz-interstitial-1.jpg",  "/media/images/v2/quiz-interstitial-1.jpg"],
  ["/media/images/hero-poster.jpg",          "/media/images/v2/hero-poster.jpg"],
  ["/posters/6296583.jpg",                   "/media/images/v2/coach-james-wright.jpg"],
  ["/posters/7674511.jpg",                   "/media/images/v2/programme-first-race.jpg"],
  ["/posters/8343383.jpg",                   "/media/images/v2/programme-doubles.jpg"],
  ["/posters/18573489.jpg",                  "/media/images/v2/programme-pro.jpg"],
  ["/hero-poster.jpg",                       "/media/images/v2/hero-poster.jpg"],
];

const FILE_GLOB = execSync(
  `grep -rl '/media/images/\\|/posters/\\|/hero-poster.jpg' ${ROOT}/app ${ROOT}/components ${ROOT}/lib ${ROOT}/content 2>/dev/null | grep -v node_modules`,
  { encoding: "utf8" },
).trim().split("\n").filter(Boolean);

let touchedFiles = 0;
let totalSwaps = 0;
for (const path of FILE_GLOB) {
  const before = readFileSync(path, "utf8");
  let after = before;
  for (const [from, to] of SIMPLE_SWAPS) {
    after = after.split(from).join(to);
  }
  if (after !== before) {
    writeFileSync(path, after, "utf8");
    const delta = SIMPLE_SWAPS.reduce(
      (n, [from]) => n + (before.split(from).length - 1),
      0,
    );
    totalSwaps += delta;
    touchedFiles++;
    console.log(`  ${path.replace(ROOT + "/", "")}  (${delta} swaps)`);
  }
}

console.log(`\nFiles changed: ${touchedFiles}`);
console.log(`References swapped: ${totalSwaps}`);
