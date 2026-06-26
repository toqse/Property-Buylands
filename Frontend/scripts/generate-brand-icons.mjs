import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "public");
const BRAND = path.join(PUBLIC, "brand");
const SOURCE = path.join(PUBLIC, "logo new-Photoroom.png");

await fs.mkdir(BRAND, { recursive: true });

const meta = await sharp(SOURCE).metadata();
const cropSize = meta.height;
const iconSource = sharp(SOURCE).extract({
  left: 0,
  top: 0,
  width: cropSize,
  height: cropSize,
});

await sharp(SOURCE).png().toFile(path.join(BRAND, "logo.png"));

const sizes = [
  { file: "favicon-32x32.png", size: 32 },
  { file: "favicon-16x16.png", size: 16 },
  { file: "apple-touch-icon.png", size: 180 },
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
];

for (const { file, size } of sizes) {
  await iconSource
    .clone()
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(PUBLIC, file));
}

await iconSource
  .clone()
  .resize(1200, 630, {
    fit: "contain",
    background: { r: 255, g: 255, b: 255, alpha: 1 },
  })
  .png()
  .toFile(path.join(PUBLIC, "og-image.png"));

const pngToIco = (await import("png-to-ico")).default;
const favicon32 = await fs.readFile(path.join(PUBLIC, "favicon-32x32.png"));
const favicon16 = await fs.readFile(path.join(PUBLIC, "favicon-16x16.png"));
const ico = await pngToIco([favicon16, favicon32]);
await fs.writeFile(path.join(PUBLIC, "favicon.ico"), ico);

console.log("Buy Lands India brand icons generated.");
