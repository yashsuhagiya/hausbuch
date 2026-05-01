// Generates the favicon + PWA icons + Apple touch icon from a single SVG mark.
// Brand: paper bg (#F5F1E8), italic "H" in ink (#1B2A3B), rust underline (#B85C3C).
// Run with: node scripts/generate-icons.mjs

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

// One SVG, rendered at every size we need. The viewBox is 1024 so all
// coordinates below are in a stable coordinate system regardless of the
// raster output size — Sharp scales for us.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="#F5F1E8"/>
  <text x="512" y="700"
        font-family="'Noto Serif Display', 'Liberation Serif', serif"
        font-style="italic" font-weight="bold" font-size="780"
        fill="#1B2A3B" text-anchor="middle">H</text>
  <rect x="356" y="800" width="312" height="18" fill="#B85C3C"/>
</svg>`;

const targets = [
  // Next.js app conventions — these auto-generate the right <link> tags.
  { path: "src/app/icon.png", size: 32 }, // favicon
  { path: "src/app/apple-icon.png", size: 180 }, // iOS home-screen icon
  // PWA manifest icons
  { path: "public/icon-192.png", size: 192 },
  { path: "public/icon-512.png", size: 512 },
];

for (const { path, size } of targets) {
  const out = resolve(root, path);
  await mkdir(dirname(out), { recursive: true });
  const buf = await sharp(Buffer.from(svg))
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(out, buf);
  console.log(`wrote ${path} (${size}×${size}, ${buf.length} bytes)`);
}
