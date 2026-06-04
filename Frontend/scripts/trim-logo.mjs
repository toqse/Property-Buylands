import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const input = path.join(
  ROOT,
  "public",
  "1530_201124_premiova_properties_BS-PNG-01-removebg-preview.png",
);
const output = path.join(ROOT, "public", "logo-trimmed.png");

await fs.mkdir(path.dirname(output), { recursive: true });

await sharp(input)
  // Removes "boring" edges; for PNGs with transparent padding this trims it nicely.
  .trim()
  .png()
  .toFile(output);

console.log(`Trimmed logo written to ${output}`);

