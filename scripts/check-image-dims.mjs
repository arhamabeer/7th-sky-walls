/**
 * Verifies that every artwork image on disk matches the pixel dimensions
 * declared in artworks.json.
 *
 * A mismatch is a real defect: next/image reserves space from the declared
 * numbers, so wrong values cause layout shift and letterboxed renders, and the
 * AR pipeline derives print proportions from the same figures.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const artworks = JSON.parse(
  await readFile(path.join(ROOT, "src", "content", "artworks.json"), "utf8"),
);

let bad = 0;
for (const art of artworks) {
  const file = path.join(ROOT, "public", art.image.src.replace(/^\//, ""));
  const meta = await sharp(file).metadata();
  const declared = `${art.image.width}x${art.image.height}`;
  const actual = `${meta.width}x${meta.height}`;
  if (declared !== actual) {
    bad++;
    console.log(`MISMATCH ${art.slug}: declared ${declared}, file ${actual}`);
  }
}

console.log(
  bad
    ? `\n${bad} of ${artworks.length} images do not match their declared dimensions.`
    : `\nAll ${artworks.length} images match their declared dimensions.`,
);
process.exit(bad ? 1 : 0);
