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
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { unzipSync } from "fflate";

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
  };
}

let checked = 0;

for (const art of artworks) {
  const entry = manifest[art.slug];
  if (!entry) {
    fail(art.slug, "missing from the AR manifest");
    continue;
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
