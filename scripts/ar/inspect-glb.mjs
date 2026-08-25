/**
 * Inspects a generated GLB and reports what actually got authored: mesh and
 * primitive counts, materials, textures and — most importantly — the bounding
 * box in metres.
 *
 * The bounding box is the check that matters. True-to-scale AR placement rests
 * entirely on the model being authored at the artwork's real printed size, and
 * that is invisible until measured.
 *
 * Usage: node scripts/ar/inspect-glb.mjs <file.glb> [expectedWidthCm] [expectedHeightCm]
 */
import { NodeIO } from "@gltf-transform/core";
import { readFile } from "node:fs/promises";

const [, , file, expectedW, expectedH] = process.argv;
if (!file) {
  console.error("usage: node scripts/ar/inspect-glb.mjs <file.glb> [widthCm] [heightCm]");
  process.exit(1);
}

const bytes = await readFile(file);
const doc = await new NodeIO().readBinary(new Uint8Array(bytes));
const root = doc.getRoot();

const bounds = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
for (const mesh of root.listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute("POSITION");
    const min = pos.getMin([]);
    const max = pos.getMax([]);
    for (let i = 0; i < 3; i++) {
      bounds.min[i] = Math.min(bounds.min[i], min[i]);
      bounds.max[i] = Math.max(bounds.max[i], max[i]);
    }
  }
}

const sizeM = bounds.max.map((v, i) => v - bounds.min[i]);
const sizeCm = sizeM.map((v) => Math.round(v * 1000) / 10);

console.log(`file: ${file}`);
console.log(`bytes: ${bytes.byteLength.toLocaleString()}`);
console.log(`meshes: ${root.listMeshes().length}`);
console.log(
  `primitives: ${root.listMeshes().reduce((n, m) => n + m.listPrimitives().length, 0)}`,
);
console.log(`materials: ${root.listMaterials().map((m) => m.getName()).join(", ")}`);
console.log(
  `textures: ${root.listTextures().map((t) => `${t.getMimeType()} ${(t.getImage()?.byteLength ?? 0).toLocaleString()}B`).join(", ") || "none"}`,
);
console.log(`size (cm): ${sizeCm[0]} wide x ${sizeCm[1]} tall x ${sizeCm[2]} deep`);

if (expectedW && expectedH) {
  const okW = Math.abs(sizeCm[0] - Number(expectedW)) < 0.2;
  const okH = Math.abs(sizeCm[1] - Number(expectedH)) < 0.2;
  console.log(
    okW && okH
      ? `SCALE OK — matches the expected ${expectedW} x ${expectedH} cm`
      : `SCALE MISMATCH — expected ${expectedW} x ${expectedH} cm`,
  );
  if (!okW || !okH) process.exit(1);
}
