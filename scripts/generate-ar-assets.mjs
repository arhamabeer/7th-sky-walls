/**
 * Generates AR assets for the whole catalogue: one GLB and one USDZ per
 * artwork per size, plus a manifest the app reads at build time.
 *
 * Assets are produced per SIZE because true-to-scale placement comes from the
 * file's authored dimensions — neither Scene Viewer nor Quick Look can be
 * asked to rescale a model at launch, and `ar-scale="fixed"` exists precisely
 * to stop the user doing it either. A single model scaled at runtime would
 * only be correct in the in-page viewer and wrong in both handoff paths.
 *
 * The texture is built once per artwork and shared across its sizes: the wall
 * margin is proportional, so the same image is correct at every size.
 *
 * Usage:
 *   node scripts/generate-ar-assets.mjs            # whole catalogue
 *   node scripts/generate-ar-assets.mjs sabr noor  # named artworks only
 */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildArTexture, wallToneFor } from "./ar/build-texture.mjs";
import { buildGlb } from "./ar/build-glb.mjs";
import { buildUsdz } from "./ar/build-usdz.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const AR_DIR = path.join(ROOT, "public", "ar");
const ONLY = process.argv.slice(2);

/** Texture resolution for AR. Wall art is viewed from a metre or more away. */
const TEXTURE_MAX_EDGE = 1024;
/** Physical depth of a finished piece, in centimetres. */
const DEPTH_CM = 3.5;

/** Mirrors content/catalog.ts — kept in sync by check:ar-manifest. */
const ORIENTATION_ASPECT = {
  portrait: 3 / 4,
  landscape: 4 / 3,
  square: 1,
  panorama: 5 / 2,
};
const SIZE_TIERS = [
  { id: "s", longEdgeCm: 60, panoramaLongEdgeCm: 120 },
  { id: "m", longEdgeCm: 80, panoramaLongEdgeCm: 150 },
  { id: "l", longEdgeCm: 120, panoramaLongEdgeCm: 200 },
  { id: "xl", longEdgeCm: 160, panoramaLongEdgeCm: 250 },
];

function resolveSize(tier, orientation) {
  const longEdge =
    orientation === "panorama" ? tier.panoramaLongEdgeCm : tier.longEdgeCm;
  const aspect = ORIENTATION_ASPECT[orientation];
  return {
    widthCm: orientation === "portrait" ? Math.round(longEdge * aspect) : longEdge,
    heightCm: orientation === "portrait" ? longEdge : Math.round(longEdge / aspect),
  };
}

/** USD prim names allow only letters, digits and underscore. */
const primName = (title) => {
  const cleaned = title.replace(/[^A-Za-z0-9_]/g, "");
  return /^[0-9]/.test(cleaned) ? `_${cleaned}` : cleaned || "Artwork";
};

async function main() {
  const artworks = JSON.parse(
    await readFile(path.join(ROOT, "src", "content", "artworks.json"), "utf8"),
  );
  const targets = ONLY.length
    ? artworks.filter((a) => ONLY.includes(a.slug))
    : artworks;

  if (!targets.length) {
    console.error(`No artworks matched: ${ONLY.join(", ")}`);
    process.exit(1);
  }

  if (!ONLY.length) await rm(AR_DIR, { recursive: true, force: true });
  await mkdir(AR_DIR, { recursive: true });

  const manifest = {};
  let totalBytes = 0;

  for (const art of targets) {
    const wall = wallToneFor(art.wallTone);
    const aspect = ORIENTATION_ASPECT[art.orientation];

    const texture = await buildArTexture({
      sourcePath: path.join(ROOT, "public", art.image.src.replace(/^\//, "")),
      maxEdge: TEXTURE_MAX_EDGE,
      wall,
      aspect,
    });

    const dir = path.join(AR_DIR, art.slug);
    await mkdir(dir, { recursive: true });

    const entry = { wall: wall.name, sizes: {} };

    for (const tier of SIZE_TIERS) {
      if (!art.sizes.includes(tier.id)) continue;
      const { widthCm, heightCm } = resolveSize(tier, art.orientation);

      const glb = await buildGlb({
        // Alpha PNG: the plane shows the letters and the wall between them.
        textureBuffer: texture.alpha,
        widthCm,
        heightCm,
        depthCm: DEPTH_CM,
        frameUv: texture.frameUv,
        name: primName(art.title),
      });
      const usdz = buildUsdz({
        // Opaque, until Quick Look's cutout alpha is confirmed on a device.
        textureBuffer: texture.opaque,
        widthCm,
        heightCm,
        depthCm: DEPTH_CM,
        frameUv: texture.frameUv,
        name: primName(art.title),
        alignment: "vertical",
      });

      await writeFile(path.join(dir, `${tier.id}.glb`), glb);
      await writeFile(path.join(dir, `${tier.id}.usdz`), usdz);

      totalBytes += glb.byteLength + usdz.byteLength;
      entry.sizes[tier.id] = {
        glb: `/ar/${art.slug}/${tier.id}.glb`,
        usdz: `/ar/${art.slug}/${tier.id}.usdz`,
        widthCm,
        heightCm,
        depthCm: DEPTH_CM,
        glbBytes: glb.byteLength,
        usdzBytes: usdz.byteLength,
      };
    }

    manifest[art.slug] = entry;
    console.log(
      `ok ${art.slug} (${wall.name}, ${Object.keys(entry.sizes).length} sizes)`,
    );
  }

  // Merge rather than replace when only some artworks were rebuilt.
  const manifestPath = path.join(ROOT, "src", "content", "ar-manifest.json");
  let merged = manifest;
  if (ONLY.length) {
    try {
      const existing = JSON.parse(await readFile(manifestPath, "utf8"));
      merged = { ...existing, ...manifest };
    } catch {
      /* no existing manifest */
    }
  }
  await writeFile(manifestPath, JSON.stringify(merged, null, 2) + "\n");

  const mb = (totalBytes / 1024 / 1024).toFixed(1);
  console.log(
    `\ndone: ${targets.length} artworks, ${totalBytes.toLocaleString()} bytes of AR assets (${mb} MB)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
