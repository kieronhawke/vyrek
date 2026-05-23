/**
 * Generates the hero poster (used until a real Pexels clip is dropped in).
 * Dark gradient + brand accent glow + film grain — moody enough to stand
 * in for the looping video. Renders at 1920×1080 for HD displays.
 */
import sharp from "sharp";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = join(__dirname, "..", "public", "hero-poster.jpg");

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080">
  <defs>
    <radialGradient id="glow" cx="50%" cy="120%" r="80%">
      <stop offset="0%"  stop-color="#A3E635" stop-opacity="0.35"/>
      <stop offset="40%" stop-color="#1A3D08" stop-opacity="0.20"/>
      <stop offset="80%" stop-color="#0A0A0A" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="vignette" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%"  stop-color="#0A0A0A" stop-opacity="0.95"/>
      <stop offset="50%" stop-color="#141414" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#0A0A0A" stop-opacity="0.95"/>
    </linearGradient>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="5"/>
      <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.06 0"/>
    </filter>
  </defs>
  <rect width="1920" height="1080" fill="#0A0A0A"/>
  <rect width="1920" height="1080" fill="url(#glow)"/>
  <rect width="1920" height="1080" fill="url(#vignette)"/>
  <rect width="1920" height="1080" filter="url(#grain)" opacity="0.7"/>
</svg>
`;

await sharp(Buffer.from(svg))
  .resize(1920, 1080)
  .jpeg({ quality: 82, progressive: true, mozjpeg: true })
  .toFile(out);

console.log(`wrote ${out}`);
