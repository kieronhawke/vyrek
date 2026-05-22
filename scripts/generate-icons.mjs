import sharp from "sharp";
import { writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const BG = "#0A0A0A";
const FG = "#F5F5F3";

// Standard icon (icon fills frame, light glyph on dark bg)
const standardSvg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="24" fill="${BG}"/>
  <path d="M16 18 L32 46 L48 18" stroke="${FG}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`;

// Maskable icon — glyph fits inside Android's 80% safe area (8/64 padding ≈ 12.5%, so glyph spans 48/64).
const maskableSvg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="${BG}"/>
  <path d="M22 22 L32 42 L42 22" stroke="${FG}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`;

// Apple touch icon — solid dark bg, glyph fills (iOS rounds the corners itself).
const appleSvg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="${BG}"/>
  <path d="M16 18 L32 46 L48 18" stroke="${FG}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`;

const targets = [
  { svg: standardSvg(192), out: "public/icon-192.png", size: 192 },
  { svg: standardSvg(512), out: "public/icon-512.png", size: 512 },
  { svg: maskableSvg(192), out: "public/icon-maskable-192.png", size: 192 },
  { svg: maskableSvg(512), out: "public/icon-maskable-512.png", size: 512 },
  { svg: appleSvg(180), out: "app/apple-icon.png", size: 180 },
];

for (const { svg, out, size } of targets) {
  const buf = await sharp(Buffer.from(svg))
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(join(root, out), buf);
  console.log(`wrote ${out} (${size}x${size}, ${buf.length} bytes)`);
}
