#!/usr/bin/env node
// Download 30 unique Pexels photos, resize + convert to webp via sips.
// Output: public/media/images/v2/<role>.webp + attribution.json
//
// Pexels is royalty-free for commercial use, no attribution required, but
// we capture the photo IDs so we can credit photographers if we want to.

import { mkdir, writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

const TMP = "/tmp/vyrek-stock";
const OUT = "/Users/kieronhawke/code/vyrek/public/media/images/v2";

await mkdir(TMP, { recursive: true });
await mkdir(OUT, { recursive: true });

// role  -> Pexels photo id  + intent (short alt-text seed)
const IMAGES = [
  // Programmes (4)
  ["programme-first-race",   7242918,  "First-time runner, outdoor track, golden-hour"],
  ["programme-sub-90",      26597325,  "Athlete pushing a weighted sled, mid-effort"],
  ["programme-doubles",      4853062,  "Two athletes training together, gym floor"],
  ["programme-pro",         26597303,  "Elite athlete, intense sled push, full commitment"],

  // Coaches (2)
  ["coach-james-wright",    32695885,  "Male coach in his thirties, focused expression"],
  ["coach-hannah-ward",      8455985,  "Female athlete in starting stance, track setting"],

  // Bento landing tiles (3)
  ["bento-coaches",          8401091,  "Coach demonstrating a movement to an athlete"],
  ["bento-plan",             4944001,  "Hand holding a phone showing a training plan"],
  ["bento-progress",         6473732,  "Athlete checking watch metrics after a session"],

  // Testimonials (3)
  ["testimonial-sarah",      7242885,  "Female runner in her thirties on a UK street"],
  ["testimonial-marcus",    26582396,  "Male athlete on the sled, sub-90 effort level"],
  ["testimonial-doubles",    4854295,  "Two partners high-fiving after a workout"],

  // Quiz interstitials (3)
  ["quiz-interstitial-1",    4348640,  "Calm pre-run scene, athlete tying shoes"],
  ["quiz-interstitial-2",    6740054,  "Wall ball mid-rep, focused throw"],
  ["quiz-interstitial-3",    8611382,  "Indoor rower, controlled stroke"],

  // About (3)
  ["about-coaching",        32546039,  "Hyrox-style training environment"],
  ["about-portrait",        14013675,  "Athlete portrait, gym backdrop"],
  ["about-outdoor",          4422913,  "Athlete running on a UK trail"],

  // How It Works (4 steps)
  ["how-step-1",             4162581,  "Phone in hand showing a quiz screen"],
  ["how-step-2",            13993656,  "Wall ball rep, programming in action"],
  ["how-step-3",            27810160,  "Functional fitness intensity"],
  ["how-step-4",            16996376,  "Lifting under load, progression"],

  // Hero poster (1)
  ["hero-poster",           12890883,  "Cinematic sled push, low light"],

  // Member-app coach videos (5 thumbnails)
  ["video-ski-erg",          6551441,  "Ski-erg / rowing-style indoor cardio"],
  ["video-sled-pull",        9602278,  "Sled pull, hand-over-hand"],
  ["video-burpee",          27810156,  "Burpee broad jump, mid-air"],
  ["video-farmers",         18060078,  "Loaded carry walk"],
  ["video-recovery",         3764553,  "Post-session mobility stretch"],

  // Spare diversity (2)
  ["diverse-1",             31255961,  "Two women lifting together"],
  ["diverse-2",             14591527,  "Mixed-age athletes mid-workout"],
];

const results = [];

for (const [role, id, alt] of IMAGES) {
  const out = `${OUT}/${role}.jpg`;
  if (existsSync(out)) {
    console.log(`  skip ${role} (exists)`);
    continue;
  }

  // Pexels CDN: direct fetch, no API key, w=1920 caps the longest edge.
  const url = `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?cs=srgb&w=1920`;
  try {
    execSync(`curl -sLfo "${out}" "${url}"`, { stdio: "pipe" });
  } catch (e) {
    console.log(`  ✗ fetch ${role} (${id}): ${e.message.slice(0, 80)}`);
    continue;
  }

  // Resize: cap at 1920w longest edge. Re-encode JPEG at 82% to flatten
  // size. Vercel's /_next/image converts to webp/avif at request time, so
  // shipping JPEG here is the canonical approach (and survives sips not
  // writing webp).
  execSync(`sips -Z 1920 -s formatOptions 82 "${out}" --out "${out}" >/dev/null 2>&1`);

  const bytes = execSync(`stat -f%z "${out}"`).toString().trim();
  console.log(`  ✓ ${role}  (id=${id}, ${(bytes / 1024).toFixed(0)} KB)`);
  results.push({ role, pexelsId: id, bytes: Number(bytes), alt });
}

await writeFile(
  `${OUT}/_attribution.json`,
  JSON.stringify(
    {
      source: "pexels.com",
      licence: "Pexels License (royalty-free, no attribution required)",
      fetched: new Date().toISOString(),
      photos: results,
    },
    null,
    2,
  ),
);

console.log(`\nDownloaded: ${results.length}/${IMAGES.length}`);
