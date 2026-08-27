/**
 * Validates every generated AR asset against the manifest and the catalogue.
 *
 * The checks that matter are physical: each GLB and each USDZ must encode the
 * exact finished dimensions the site advertises for that size, because a
 * mismatch means the artwork appears on someone's wall at the wrong size while
 * the page confidently states otherwise. Structural checks on the USDZ run
 * too, since a malformed archive fails silently in Quick Look.
 *
 * Usage: node scripts/ar/check-all.mjs
 */
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { unzipSync } from "fflate";
import { buildArTexture, wallToneFor } from "./build-texture.mjs";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const TOLERANCE_CM = 0.2;

const failures = [];
const fail = (what, detail) => failures.push(`${what} — ${detail}`);

const artworks = JSON.parse(
  await readFile(path.join(ROOT, "src", "content", "artworks.json"), "utf8"),
);
const manifest = JSON.parse(
  await readFile(path.join(ROOT, "src", "content", "ar-manifest.json"), "utf8"),
);

/**
 * The AR generator's copy of the catalogue geometry must match the catalogue.
 *
 * `generate-ar-assets.mjs` keeps its own `ORIENTATION_ASPECT` and `SIZE_TIERS`
 * because it is a .mjs script and `src/content/catalog.ts` is TypeScript. Its
 * comment says "kept in sync by check:ar-manifest" — and there is no
 * `check:ar-manifest`. Nothing compared them. That comment was worse than no
 * comment, because whoever edits a size tier reads it and trusts a gate that
 * does not exist.
 *
 * It matters more here than the usual duplication, because the checks below
 * verify each model against the *manifest*, and the manifest is written from
 * these very numbers. A drifted tier is self-consistent all the way through and
 * passes everything — while the model on somebody's wall is a different size
 * from the one the page advertises, on a site whose whole promise is true to
 * size.
 */
function numericMap(source, name) {
  const start = source.indexOf(name);
  if (start === -1) return null;
  const body = source.slice(source.indexOf("{", start) + 1, source.indexOf("}", start));
  const out = {};
  for (const [, key, expr] of body.matchAll(/(\w+)\s*:\s*([\d.\s/*+-]+?)\s*,/g)) {
    // Only arithmetic on literals, so this evaluates "3 / 4" without evaluating code.
    if (!/^[\d.\s/*+-]+$/.test(expr)) return null;
    out[key] = Number(new Function(`return (${expr});`)());
  }
  return Object.keys(out).length ? out : null;
}

function numberedRows(source, name) {
  const start = source.indexOf(name);
  if (start === -1) return null;
  const body = source.slice(start, source.indexOf("\n];", start));
  const rows = [...body.matchAll(/\{[^}]*id:\s*"(\w+)"[^}]*\}/g)].map((m) => {
    const row = { id: m[1] };
    for (const [, key, value] of m[0].matchAll(/(\w*[Cc]m)\s*:\s*(\d+(?:\.\d+)?)/g)) {
      row[key] = Number(value);
    }
    return row;
  });
  return rows.length ? rows : null;
}

const catalogSource = await readFile(path.join(ROOT, "src", "content", "catalog.ts"), "utf8");
const generatorSource = await readFile(
  path.join(ROOT, "scripts", "generate-ar-assets.mjs"),
  "utf8",
);

{
  const catalog = catalogSource;
  const generator = generatorSource;

  const pairs = [
    ["ORIENTATION_ASPECT", numericMap(catalog, "ORIENTATION_ASPECT"), numericMap(generator, "ORIENTATION_ASPECT")],
    ["SIZE_TIERS", numberedRows(catalog, "SIZE_TIERS"), numberedRows(generator, "SIZE_TIERS")],
  ];

  for (const [name, fromCatalog, fromGenerator] of pairs) {
    if (!fromCatalog || !fromGenerator) {
      fail(
        name,
        "could not be read from both catalog.ts and generate-ar-assets.mjs, so this " +
          "check would pass without comparing anything",
      );
      continue;
    }
    // Compared by the fields the generator actually carries: the catalogue also
    // has labels, which the AR pipeline has no use for.
    const trimmed = Array.isArray(fromCatalog)
      ? fromCatalog.map((row, i) =>
          Object.fromEntries(Object.keys(fromGenerator[i] ?? {}).map((k) => [k, row[k]])),
        )
      : fromCatalog;
    const a = JSON.stringify(trimmed);
    const b = JSON.stringify(fromGenerator);
    if (a !== b) {
      fail(name, `catalog.ts has ${a} but the AR generator has ${b}`);
    }
  }
}

/**
 * The texture each artwork produces, rebuilt so the models can be compared to it
 * rather than to a record of themselves.
 *
 * The existing staleness check compares the manifest's `source` to the artwork's
 * URL, which catches "the artwork changed and nobody regenerated" — the real
 * failure that hit four pieces at once. What it cannot catch is the generator
 * writing the wrong bytes: the manifest is written from `art.image.src` in the
 * same loop, so a model carrying another piece's texture would be recorded
 * correctly and pass everything. That is the same shape as the bug the source
 * field was added for — a check comparing the generator's record to the
 * generator's own output.
 *
 * Comparable exactly, because `buildArTexture` is deterministic: two runs over
 * the same artwork produce byte-identical output, verified across a portrait, a
 * landscape and a mirror set. So this is a hash comparison rather than an image
 * one. The GLB carries the alpha texture and the USDZ the opaque one, which is
 * what the generator puts in each.
 *
 * Built lazily and cached: one build per artwork, shared across its four sizes,
 * exactly as the generator shares it.
 */
/**
 * The two inputs the rebuild needs, read from the generator rather than copied.
 *
 * A second copy of either here would be the defect this whole file now guards
 * against, one layer up: the check would agree with whatever it had remembered.
 * `ORIENTATION_ASPECT` is already asserted equal to the catalogue above, so
 * reading the generator's copy is reading the catalogue's.
 */
const TEXTURE_MAX_EDGE = Number(
  generatorSource.match(/const TEXTURE_MAX_EDGE = (\d+);/)?.[1] ?? NaN,
);
const ORIENTATION_ASPECT_FOR_AR = numericMap(generatorSource, "ORIENTATION_ASPECT");
if (!Number.isFinite(TEXTURE_MAX_EDGE) || !ORIENTATION_ASPECT_FOR_AR) {
  console.error(
    "Could not read TEXTURE_MAX_EDGE or ORIENTATION_ASPECT from generate-ar-assets.mjs, " +
      "so the texture comparison would rebuild against guessed inputs and pass on nothing.",
  );
  process.exit(2);
}

const textureCache = new Map();
async function textureFor(art) {
  if (!textureCache.has(art.slug)) {
    textureCache.set(
      art.slug,
      await buildArTexture({
        sourcePath: path.join(ROOT, "public", art.image.src.replace(/^\//, "")),
        maxEdge: TEXTURE_MAX_EDGE,
        wall: wallToneFor(art.wallTone),
        aspect: ORIENTATION_ASPECT_FOR_AR[art.orientation],
      }),
    );
  }
  return textureCache.get(art.slug);
}

const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

const io = new NodeIO();

async function glbSizeCm(file) {
  const doc = await io.readBinary(new Uint8Array(await readFile(file)));
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute("POSITION");
      const lo = pos.getMin([]);
      const hi = pos.getMax([]);
      for (let i = 0; i < 3; i++) {
        min[i] = Math.min(min[i], lo[i]);
        max[i] = Math.max(max[i], hi[i]);
      }
    }
  }
  return max.map((v, i) => Math.round((v - min[i]) * 1000) / 10);
}

function usdzInfo(bytes) {
  const entries = unzipSync(bytes);
  const geometry = Buffer.from(entries["geometries/Geometry.usda"] ?? []).toString("utf8");
  const model = Buffer.from(entries["model.usda"] ?? []).toString("utf8");
  const block = geometry.match(/point3f\[\] points = \[([^\]]+)\]/)?.[1] ?? "";
  const points = [...block.matchAll(/\(\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)\s*\)/g)].map(
    (m) => [Number(m[1]), Number(m[2]), Number(m[3])],
  );
  const normalsBlock = geometry.match(/normal3f\[\] normals = \[([^\]]+)\]/)?.[1] ?? "";
  const firstNormal = [
    ...normalsBlock.matchAll(/\(\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)\s*\)/g),
  ]
    .slice(0, 1)
    .map((m) => [Number(m[1]), Number(m[2]), Number(m[3])])[0];
  const sizeCm = points.length
    ? [0, 1, 2].map((i) => {
        const axis = points.map((p) => p[i]);
        return Math.round((Math.max(...axis) - Math.min(...axis)) * 1000) / 10;
      })
    : null;

  // Stored-and-aligned check, walking local file headers.
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let cursor = 0;
  let stored = true;
  let aligned = true;
  while (cursor + 30 <= bytes.length && view.getUint32(cursor, true) === 0x04034b50) {
    const method = view.getUint16(cursor + 8, true);
    const nameLen = view.getUint16(cursor + 26, true);
    const extraLen = view.getUint16(cursor + 28, true);
    const compressedSize = view.getUint32(cursor + 18, true);
    const dataOffset = cursor + 30 + nameLen + extraLen;
    if (method !== 0) stored = false;
    if (dataOffset % 64 !== 0) aligned = false;
    cursor = dataOffset + compressedSize;
  }

  return {
    sizeCm,
    stored,
    aligned,
    // After the baked Rx(-90°) the artwork's front normal points along +Y.
    rotationBaked: Boolean(firstNormal && Math.abs(firstNormal[1] - 1) < 0.01),
    entries: Object.keys(entries),
    verticalAnchoring: /planeAnchoring:alignment\s*=\s*"vertical"/.test(model),
    metersPerUnit: /metersPerUnit\s*=\s*1\b/.test(model),
    textureResolves: (() => {
      const m = model.match(/asset inputs:file\s*=\s*@([^@]+)@/);
      return Boolean(m && Object.keys(entries).includes(m[1]));
    })(),
    // The bytes, not just the name, so the texture can be compared to the one
    // this artwork actually produces — see the note above `textureFor`.
    textureBytes: (() => {
      const m = model.match(/asset inputs:file\s*=\s*@([^@]+)@/);
      return m && entries[m[1]] ? Buffer.from(entries[m[1]]) : null;
    })(),
  };
}

let checked = 0;

for (const art of artworks) {
  const entry = manifest[art.slug];
  if (!entry) {
    fail(art.slug, "missing from the AR manifest");
    continue;
  }

  /**
   * The models must have been built from the artwork the site is serving.
   *
   * Everything else here validates geometry and packaging, which stay correct
   * even when the texture inside is a previous version of the piece — so
   * regenerating an artwork and forgetting `generate:ar` left four pieces
   * showing the old image in AR with every check passing. The artwork's URL
   * carries a hash of its bytes, so comparing URLs compares the images.
   */
  if (entry.source && entry.source !== art.image.src) {
    fail(
      art.slug,
      `AR models were built from ${entry.source} but the site now serves ` +
        `${art.image.src} — run \`npm run generate:ar\``,
    );
  } else if (!entry.source) {
    fail(art.slug, "manifest records no source artwork; run `npm run generate:ar`");
  }

  const manifestSizes = Object.keys(entry.sizes);
  const missing = art.sizes.filter((s) => !manifestSizes.includes(s));
  if (missing.length) fail(art.slug, `no AR assets for size(s) ${missing.join(", ")}`);

  for (const [sizeId, info] of Object.entries(entry.sizes)) {
    const label = `${art.slug}/${sizeId}`;

    const glbPath = path.join(ROOT, "public", info.glb.replace(/^\//, ""));
    const usdzPath = path.join(ROOT, "public", info.usdz.replace(/^\//, ""));

    let glbSize;
    try {
      glbSize = await glbSizeCm(glbPath);
    } catch (err) {
      fail(label, `GLB unreadable: ${String(err).slice(0, 80)}`);
      continue;
    }
    if (
      Math.abs(glbSize[0] - info.widthCm) > TOLERANCE_CM ||
      Math.abs(glbSize[1] - info.heightCm) > TOLERANCE_CM
    ) {
      fail(
        label,
        `GLB is ${glbSize[0]}x${glbSize[1]} cm, manifest says ${info.widthCm}x${info.heightCm}`,
      );
    }

    let usdz;
    try {
      usdz = usdzInfo(new Uint8Array(await readFile(usdzPath)));
    } catch (err) {
      fail(label, `USDZ unreadable: ${String(err).slice(0, 80)}`);
      continue;
    }
    // Width stays on X; height moves to Z under the Quick Look rotation.
    if (!usdz.sizeCm) {
      fail(label, "USDZ has no readable points array");
    } else if (
      Math.abs(usdz.sizeCm[0] - info.widthCm) > TOLERANCE_CM ||
      Math.abs(usdz.sizeCm[2] - info.heightCm) > TOLERANCE_CM
    ) {
      fail(
        label,
        `USDZ is ${usdz.sizeCm[0]} wide x ${usdz.sizeCm[2]} tall, manifest says ${info.widthCm}x${info.heightCm}`,
      );
    }
    if (!usdz.rotationBaked) {
      fail(label, "USDZ is missing the Quick Look rotation; the artwork would face the wall");
    }
    if (!usdz.stored) fail(label, "USDZ entries are compressed; Quick Look requires stored");
    if (!usdz.aligned) fail(label, "USDZ entry data is not 64-byte aligned");
    if (!usdz.verticalAnchoring) fail(label, "USDZ is missing vertical plane anchoring");
    if (!usdz.metersPerUnit) fail(label, "USDZ does not declare metersPerUnit = 1");
    if (!usdz.textureResolves) fail(label, "USDZ texture reference does not resolve");

    /**
     * The texture inside each model must be the one this artwork produces.
     *
     * Everything above would still pass if the generator wrote another piece's
     * image: the sizes are right, the archive is shaped right, the reference
     * resolves, and the manifest's `source` was written from this artwork in the
     * same loop. Somebody would see the wrong artwork on their wall at exactly
     * the right size.
     */
    const expected = await textureFor(art);
    try {
      const doc = await io.readBinary(new Uint8Array(await readFile(glbPath)));
      const embedded = doc.getRoot().listTextures().map((t) => t.getImage());
      if (embedded.length !== 1) {
        fail(label, `GLB carries ${embedded.length} textures, expected exactly 1`);
      } else if (digest(embedded[0]) !== digest(expected.alpha)) {
        fail(label, "the texture inside the GLB is not the one this artwork produces");
      }
    } catch (err) {
      fail(label, `GLB texture could not be read — ${String(err).slice(0, 80)}`);
    }

    if (!usdz.textureBytes) {
      fail(label, "USDZ texture bytes could not be read");
    } else if (digest(usdz.textureBytes) !== digest(expected.opaque)) {
      fail(label, "the texture inside the USDZ is not the one this artwork produces");
    }

    checked++;
  }
}

console.log(`Checked ${checked} AR asset pairs across ${artworks.length} artworks.`);
if (failures.length) {
  console.log(`\n${failures.length} problem(s):`);
  for (const f of failures.slice(0, 25)) console.log(`  FAIL ${f}`);
  if (failures.length > 25) console.log(`  ...and ${failures.length - 25} more`);
  console.log("\nRESULT: FAIL\n");
  process.exit(1);
}
console.log("RESULT: PASS — every asset encodes its advertised size and is Quick Look shaped.\n");
