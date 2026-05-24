import sharp from "sharp";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BG = "#1a1f4b";
const FG = "#ffffff";
const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

function iconSvg(size) {
  const fontSize = Math.round(size * 0.52);
  const radius = Math.round(size * 0.12);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BG}" rx="${radius}"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
    font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="${fontSize}" font-weight="700" fill="${FG}">M</text>
</svg>`;
}

for (const size of [192, 512]) {
  await sharp(Buffer.from(iconSvg(size)))
    .png()
    .toFile(join(publicDir, `icon-${size}.png`));
}

await sharp(Buffer.from(iconSvg(32)))
  .png()
  .toFile(join(publicDir, "favicon.ico"));

console.log("Generated public/icon-192.png, public/icon-512.png, public/favicon.ico");
