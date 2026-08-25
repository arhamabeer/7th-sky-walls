/**
 * Builds a framed-artwork GLB for one artwork at one physical size.
 *
 * The model is authored in METRES at the artwork's real finished dimensions.
 * That is the entire basis of true-to-scale placement: glTF defines one unit
 * as one metre, and both Scene Viewer and the WebXR path place the file at its
 * authored size, so the numbers here are what make the piece appear at its
 * actual size on someone's wall.
 *
 * One mesh, one material, one texture — the frame is composited into the
 * texture (see build-texture.mjs) rather than modelled separately. The side
 * faces pin their UVs to a point inside the frame border so they read as flat
 * frame colour instead of stretched artwork.
 */
import { Document, NodeIO } from "@gltf-transform/core";

/**
 * Vertex data for the piece.
 *
 * Authoring convention, shared with the USDZ builder:
 *   +Y up, +X right, artwork front face normal = +Z, one unit = one metre.
 *   Centred on X and Y, but the BACK of the frame sits at z = 0 so the body
 *   occupies z ∈ [0, depth].
 *
 * That last part is deliberate. Scene Viewer and model-viewer's WebXR wall
 * path both place the model without pitching it, resting its -Z extent against
 * the wall — so putting the back at the origin makes the piece sit flush
 * instead of half-sunk into the plaster.
 *
 * The front face carries the full texture. The other five pin every UV to
 * `frameUv`, sampling a single flat colour from the frame border.
 *
 * Winding is counter-clockwise viewed from outside, matching glTF's front-face
 * convention.
 */
export function boxGeometry(width, height, depth, frameUv) {
  const x = width / 2;
  const y = height / 2;
  const z = depth;
  const [fu, fv] = frameUv;
  const flat = [fu, fv, fu, fv, fu, fv, fu, fv];

  // Back plane at z = 0, front plane at z = depth.
  const zb = 0;
  const zf = z;

  const faces = [
    // front (+Z) — the artwork, UV origin top-left per glTF
    {
      p: [-x, -y, zf, x, -y, zf, x, y, zf, -x, y, zf],
      n: [0, 0, 1],
      uv: [0, 1, 1, 1, 1, 0, 0, 0],
    },
    { p: [x, -y, zb, -x, -y, zb, -x, y, zb, x, y, zb], n: [0, 0, -1], uv: flat },
    { p: [x, -y, zf, x, -y, zb, x, y, zb, x, y, zf], n: [1, 0, 0], uv: flat },
    { p: [-x, -y, zb, -x, -y, zf, -x, y, zf, -x, y, zb], n: [-1, 0, 0], uv: flat },
    { p: [-x, y, zf, x, y, zf, x, y, zb, -x, y, zb], n: [0, 1, 0], uv: flat },
    { p: [-x, -y, zb, x, -y, zb, x, -y, zf, -x, -y, zf], n: [0, -1, 0], uv: flat },
  ];

  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  faces.forEach((face, i) => {
    positions.push(...face.p);
    for (let v = 0; v < 4; v++) normals.push(...face.n);
    uvs.push(...face.uv);
    const base = i * 4;
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  });

  return { positions, normals, uvs, indices };
}

/**
 * @param {object} options
 * @param {Uint8Array|Buffer} options.textureBuffer  JPEG produced by buildArTexture.
 * @param {number} options.widthCm    Finished width.
 * @param {number} options.heightCm   Finished height.
 * @param {number} options.depthCm    Physical depth of the piece.
 * @param {[number, number]} options.frameUv  UV sampling a flat frame colour.
 * @param {string} options.name       Node/mesh name.
 * @returns {Promise<Uint8Array>} GLB bytes.
 */
export async function buildGlb({
  textureBuffer,
  widthCm,
  heightCm,
  depthCm = 3.5,
  frameUv = [0.5, 0.02],
  name = "Artwork",
}) {
  const doc = new Document();
  doc.createBuffer();
  const scene = doc.createScene("Scene");

  const texture = doc
    .createTexture("artwork")
    .setImage(new Uint8Array(textureBuffer))
    .setMimeType("image/jpeg");

  const material = doc
    .createMaterial("artwork")
    // Printed matte media: no metalness, high roughness, so the piece does not
    // read as a glossy screen under AR lighting.
    .setBaseColorTexture(texture)
    .setMetallicFactor(0)
    .setRoughnessFactor(0.85)
    .setDoubleSided(false);

  const geo = boxGeometry(widthCm / 100, heightCm / 100, depthCm / 100, frameUv);

  const primitive = doc
    .createPrimitive()
    .setAttribute(
      "POSITION",
      doc.createAccessor().setType("VEC3").setArray(new Float32Array(geo.positions)),
    )
    .setAttribute(
      "NORMAL",
      doc.createAccessor().setType("VEC3").setArray(new Float32Array(geo.normals)),
    )
    .setAttribute(
      "TEXCOORD_0",
      doc.createAccessor().setType("VEC2").setArray(new Float32Array(geo.uvs)),
    )
    .setIndices(
      doc.createAccessor().setType("SCALAR").setArray(new Uint16Array(geo.indices)),
    )
    .setMaterial(material);

  const mesh = doc.createMesh(name).addPrimitive(primitive);
  scene.addChild(doc.createNode(name).setMesh(mesh));

  return new NodeIO().writeBinary(doc);
}
