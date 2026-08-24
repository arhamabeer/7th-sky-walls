/**
 * Validates a generated USDZ against the structure three.js's USDZExporter
 * produces for equivalent geometry.
 *
 * The output of this pipeline can only be conclusively proven on a real
 * iPhone. Until that device test happens, the strongest available check is
 * that our archive matches a widely-used reference implementation on every
 * structural element that Quick Look actually reads: the layer header, the
 * anchoring tokens, the prim hierarchy, the shader graph, the geometry
 * attributes, and the archive layout.
 *
 * Usage: node scripts/ar/validate-usdz.mjs <file.usdz> [widthCm] [heightCm]
 */
import { readFile } from "node:fs/promises";
import { unzipSync } from "fflate";

const [, , file, expectedW, expectedH] = process.argv;
if (!file) {
  console.error("usage: node scripts/ar/validate-usdz.mjs <file.usdz> [widthCm] [heightCm]");
  process.exit(1);
}

const bytes = new Uint8Array(await readFile(file));
const entries = unzipSync(bytes);
const names = Object.keys(entries);
const text = (name) => Buffer.from(entries[name] ?? new Uint8Array()).toString("utf8");

const failures = [];
const check = (name, condition, detail = "") => {
  if (!condition) failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

// --- Archive layout -------------------------------------------------------
check("model.usda is the first entry", names[0] === "model.usda", `first: ${names[0]}`);
check("geometry file present", names.includes("geometries/Geometry.usda"));
check(
  "a texture is present",
  names.some((n) => n.startsWith("textures/")),
  names.join(", "),
);

/**
 * Quick Look requires every entry to be stored uncompressed. Walk the local
 * file headers rather than trusting the unzip result.
 */
const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
let cursor = 0;
let storedAll = true;
let alignedAll = true;
const misaligned = [];
while (cursor + 30 <= bytes.length && view.getUint32(cursor, true) === 0x04034b50) {
  const method = view.getUint16(cursor + 8, true);
  const nameLen = view.getUint16(cursor + 26, true);
  const extraLen = view.getUint16(cursor + 28, true);
  const compressedSize = view.getUint32(cursor + 18, true);
  const entryName = Buffer.from(bytes.slice(cursor + 30, cursor + 30 + nameLen)).toString();
  const dataOffset = cursor + 30 + nameLen + extraLen;

  if (method !== 0) storedAll = false;
  if (dataOffset % 64 !== 0) {
    alignedAll = false;
    misaligned.push(`${entryName}@${dataOffset}`);
  }
  cursor = dataOffset + compressedSize;
}
check("all entries stored uncompressed", storedAll);
check("all entry data is 64-byte aligned", alignedAll, misaligned.join(", "));

// --- Layer metadata -------------------------------------------------------
const model = text("model.usda");
check("usda version header", model.startsWith("#usda 1.0"));
check("metersPerUnit is 1", /metersPerUnit\s*=\s*1\b/.test(model));
check("upAxis is Y", /upAxis\s*=\s*"Y"/.test(model));
check("defaultPrim is Root", /defaultPrim\s*=\s*"Root"/.test(model));

// --- Anchoring ------------------------------------------------------------
check(
  "plane anchoring declared",
  /token preliminary:anchoring:type\s*=\s*"plane"/.test(model),
);
check(
  "vertical plane alignment declared",
  /token preliminary:planeAnchoring:alignment\s*=\s*"vertical"/.test(model),
  "wall placement depends on this",
);

// --- Prim hierarchy -------------------------------------------------------
check("Root Xform", /def Xform "Root"/.test(model));
check("Scenes scope with sceneLibrary kind", /def Scope "Scenes"[\s\S]{0,80}kind\s*=\s*"sceneLibrary"/.test(model));
check("Scene Xform", /def Xform "Scene"/.test(model));
check("geometry referenced", /prepend references\s*=\s*@\.\/geometries\/Geometry\.usda@<\/Geometry>/.test(model));
check("MaterialBindingAPI applied", /prepend apiSchemas\s*=\s*\["MaterialBindingAPI"\]/.test(model));
check("material bound", /rel material:binding\s*=\s*<\/Materials\/\w+>/.test(model));
check("transform op declared", /uniform token\[\] xformOpOrder\s*=\s*\["xformOp:transform"\]/.test(model));

// --- Shader graph ---------------------------------------------------------
for (const id of [
  "UsdPrimvarReader_float2",
  "UsdTransform2d",
  "UsdUVTexture",
  "UsdPreviewSurface",
]) {
  check(`shader ${id}`, new RegExp(`info:id\\s*=\\s*"${id}"`).test(model));
}
check("surface output connected", /token outputs:surface\.connect/.test(model));
check("diffuse driven by the texture", /inputs:diffuseColor\.connect/.test(model));
check("texture colour space is sRGB", /inputs:sourceColorSpace\s*=\s*"sRGB"/.test(model));
check(
  "texture asset path resolves to a packed entry",
  (() => {
    const m = model.match(/asset inputs:file\s*=\s*@([^@]+)@/);
    return Boolean(m && names.includes(m[1]));
  })(),
);

// --- Geometry -------------------------------------------------------------
const geometry = text("geometries/Geometry.usda");
check("mesh prim", /def Mesh "Geometry"/.test(geometry));
check("subdivision disabled", /uniform token subdivisionScheme\s*=\s*"none"/.test(geometry));
for (const attr of ["faceVertexCounts", "faceVertexIndices", "normals", "points", "primvars:st"]) {
  check(`geometry has ${attr}`, geometry.includes(attr));
}
check("normals interpolate per vertex", /normals[\s\S]{0,4000}?interpolation\s*=\s*"vertex"/.test(geometry));

// Vertex/index consistency, and the physical size the file actually encodes.
// Read from the points array specifically — the normals array holds unit
// vectors that would otherwise be measured as a 2-metre cube.
const pointsBlock = geometry.match(/point3f\[\] points = \[([^\]]+)\]/)?.[1] ?? "";
const points = [...pointsBlock.matchAll(/\(\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)\s*\)/g)].map(
  (m) => [Number(m[1]), Number(m[2]), Number(m[3])],
);
const indices = (geometry.match(/faceVertexIndices = \[([^\]]+)\]/)?.[1] ?? "")
  .split(",")
  .map((n) => Number(n.trim()));
check(
  "every index is within the point range",
  indices.length > 0 && indices.every((i) => i >= 0 && i < points.length),
  `${indices.length} indices, ${points.length} points`,
);

let sizeCm = null;
if (points.length) {
  const axis = (i) => points.map((p) => p[i]);
  sizeCm = [0, 1, 2].map(
    (i) => Math.round((Math.max(...axis(i)) - Math.min(...axis(i))) * 1000) / 10,
  );
}

/**
 * The Quick Look compensating rotation must be baked in. After Rx(-90°) the
 * artwork's front normal points along +Y and the piece's height lies on Z, so
 * the Y extent should be the frame depth — a few centimetres — rather than the
 * artwork height. Catching this matters because an unrotated USDZ still opens
 * happily in Quick Look; it just hangs the artwork facing into the wall.
 */
const normalsBlock = geometry.match(/normal3f\[\] normals = \[([^\]]+)\]/)?.[1] ?? "";
const firstNormal = [...normalsBlock.matchAll(/\(\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)\s*\)/g)]
  .slice(0, 1)
  .map((m) => [Number(m[1]), Number(m[2]), Number(m[3])])[0];
check(
  "front face normal points along +Y (Quick Look rotation baked in)",
  Boolean(firstNormal && Math.abs(firstNormal[1] - 1) < 0.01),
  firstNormal ? `first normal (${firstNormal.join(", ")})` : "no normals found",
);
if (sizeCm) {
  check(
    "depth is on the Y axis after rotation",
    sizeCm[1] < 20,
    `Y extent ${sizeCm[1]} cm — expected the frame depth, not the artwork height`,
  );
}

// --- Report ---------------------------------------------------------------
console.log(`file: ${file}`);
console.log(`bytes: ${bytes.byteLength.toLocaleString()}`);
console.log(`entries: ${names.join(", ")}`);
if (sizeCm) console.log(`size (cm): ${sizeCm[0]} x ${sizeCm[1]} x ${sizeCm[2]}`);

if (expectedW && expectedH && sizeCm) {
  // Width stays on X; height moves to Z under the baked rotation.
  const okW = Math.abs(sizeCm[0] - Number(expectedW)) < 0.2;
  const okH = Math.abs(sizeCm[2] - Number(expectedH)) < 0.2;
  check(
    "encoded size matches the expected finished size",
    okW && okH,
    `expected ${expectedW} wide x ${expectedH} tall, got X=${sizeCm[0]} Z=${sizeCm[2]}`,
  );
}

if (failures.length) {
  console.log(`\n${failures.length} structural check(s) failed:`);
  for (const f of failures) console.log(`  FAIL ${f}`);
  console.log("\nRESULT: FAIL\n");
  process.exit(1);
}
console.log("\nRESULT: PASS — matches the reference structure on every checked element.\n");
