/**
 * Builds one artwork's AR assets end to end, for quick iteration on the
 * pipeline without regenerating the whole catalogue.
 */
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { buildArTexture, frameStyleFor } from "./build-texture.mjs";
import { buildGlb } from "./build-glb.mjs";
import { buildUsdz } from "./build-usdz.mjs";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const OUT = path.join(ROOT, ".ar-tmp");
await mkdir(OUT, { recursive: true });

const materials = ["Archival matte canvas", "Floating hardwood frame"];
const frame = frameStyleFor(materials);
const widthCm = 90;
const heightCm = 120;

const texture = await buildArTexture({
  sourcePath: path.join(ROOT, "public", "artworks", "meridian-seven.jpg"),
  maxEdge: 1024,
  frame,
  aspect: widthCm / heightCm,
});

await writeFile(path.join(OUT, "smoke-texture.jpg"), texture.buffer);

const glb = await buildGlb({
  textureBuffer: texture.buffer,
  widthCm,
  heightCm,
  frameUv: texture.frameUv,
  name: "MeridianSeven",
});
await writeFile(path.join(OUT, "smoke.glb"), glb);

const usdz = buildUsdz({
  textureBuffer: texture.buffer,
  widthCm,
  heightCm,
  frameUv: texture.frameUv,
  name: "MeridianSeven",
});
await writeFile(path.join(OUT, "smoke.usdz"), usdz);

console.log(`frame style: ${frame.name}`);
console.log(`texture: ${texture.width}x${texture.height}, ${texture.buffer.byteLength.toLocaleString()} bytes`);
console.log(`glb:  ${glb.byteLength.toLocaleString()} bytes`);
console.log(`usdz: ${usdz.byteLength.toLocaleString()} bytes`);
