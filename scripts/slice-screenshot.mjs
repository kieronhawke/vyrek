/**
 * Slice a long fullPage screenshot into viewable chunks so I can Read each.
 * Usage: node scripts/slice-screenshot.mjs <input.png> <chunkHeightPx>
 */
import sharp from "sharp";
import { dirname, basename, join, extname } from "node:path";

const [, , input, chunkHeightArg] = process.argv;
if (!input) {
  console.error("Usage: node scripts/slice-screenshot.mjs <input.png> [chunkHeightPx=3000]");
  process.exit(1);
}
const chunkHeight = Number(chunkHeightArg) || 3000;

const img = sharp(input);
const meta = await img.metadata();
const total = meta.height ?? 0;
const stem = basename(input, extname(input));
const dir = dirname(input);

let i = 0;
let y = 0;
while (y < total) {
  const h = Math.min(chunkHeight, total - y);
  const out = join(dir, `${stem}__slice-${String(i).padStart(2, "0")}.png`);
  await sharp(input).extract({ left: 0, top: y, width: meta.width, height: h }).toFile(out);
  console.log(`wrote ${out} (y=${y}, h=${h})`);
  y += h;
  i += 1;
}
