"use client";

/**
 * Authors a GLB in the browser for a customer-configured piece.
 *
 * The reason this exists: configuring wording and then opening "On your wall"
 * showed the original piece. The 3D stage is the largest thing on that panel, so
 * a note explaining the difference was not enough — the visitor is looking at
 * the wrong artwork. The pre-built GLBs cannot help; they are generated at build
 * time, when nobody knows what the customer will type.
 *
 * Authoring conventions are the ones in scripts/ar/build-glb.mjs, and they are
 * load-bearing rather than stylistic:
 *
 *   - **Metres.** glTF defines one unit as one metre, and both Scene Viewer and
 *     the WebXR path place a file at its authored size. Those numbers are the
 *     entire basis of true-to-scale placement.
 *   - **Back of the piece at z = 0.** Scene Viewer and model-viewer's WebXR wall
 *     path rest a model's -Z extent against the wall without pitching it, so a
 *     model centred on z sits half-sunk into the plaster.
 *   - **One mesh, one material, one texture.** Anything else risks the class of
 *     failure that once produced a USDZ with no geometry at all.
 *
 * A plane rather than a box, unlike the pre-built models. A configured piece is
 * cut letters with the wall showing between them, so the texture carries alpha
 * and there are no side faces to give a colour to. `alphaMode: "MASK"` is well
 * supported by model-viewer's own renderer and by Scene Viewer.
 *
 * iOS is deliberately not covered here. Quick Look takes a USDZ, and whether it
 * handles cutout alpha the way this needs cannot be confirmed without an iPhone
 * — so `ios-src` keeps the original piece and the panel says so. Guessing is how
 * the empty-USDZ bug shipped the first time.
 */

const MAGIC = 0x46546c67; // "glTF"
const JSON_CHUNK = 0x4e4f534a; // "JSON"
const BIN_CHUNK = 0x004e4942; // "BIN"

/** glTF requires every chunk and bufferView to sit on a four-byte boundary. */
const padTo4 = (n: number) => (n + 3) & ~3;

function planeGeometry(widthM: number, heightM: number) {
  const x = widthM / 2;
  const y = heightM / 2;
  return {
    // Counter-clockwise seen from the front, matching glTF's convention.
    positions: new Float32Array([-x, -y, 0, x, -y, 0, x, y, 0, -x, y, 0]),
    normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]),
    // UV origin is top-left in glTF, so v is flipped relative to the positions.
    uvs: new Float32Array([0, 1, 1, 1, 1, 0, 0, 0]),
    indices: new Uint16Array([0, 1, 2, 0, 2, 3]),
  };
}

/** Strip the data-URL prefix and decode to bytes. */
function decodeDataUrl(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(",");
  const base64 = dataUrl.slice(comma + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export interface CustomGlbRequest {
  /** Transparent PNG of the configured piece, as a data URL. */
  texturePngDataUrl: string;
  widthCm: number;
  heightCm: number;
}

/**
 * Returns the GLB as a data URL.
 *
 * A data URL rather than an object URL on purpose. An object URL is a resource
 * the caller has to release, which means an effect and a cleanup — and calling
 * setState inside that effect is the cascading-render pattern React warns
 * about. A data URL is a plain value, so this can be derived with useMemo and
 * there is nothing to leak. Base64 costs a third more bytes, which on a text
 * piece is tens of kilobytes and not worth an effect to avoid.
 */
export function buildCustomGlb({
  texturePngDataUrl,
  widthCm,
  heightCm,
}: CustomGlbRequest): string {
  const geo = planeGeometry(widthCm / 100, heightCm / 100);
  const png = decodeDataUrl(texturePngDataUrl);

  // Lay the binary chunk out in accessor order, each view four-byte aligned.
  const parts: Array<{ bytes: Uint8Array; offset: number; length: number }> = [];
  let offset = 0;
  const push = (view: ArrayBufferView) => {
    const bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
    const start = padTo4(offset);
    parts.push({ bytes, offset: start, length: bytes.byteLength });
    offset = start + bytes.byteLength;
    return parts[parts.length - 1];
  };

  const vPos = push(geo.positions);
  const vNrm = push(geo.normals);
  const vUv = push(geo.uvs);
  const vIdx = push(geo.indices);
  const vImg = push(png);

  const binLength = padTo4(offset);
  const bin = new Uint8Array(binLength);
  for (const part of parts) bin.set(part.bytes, part.offset);

  const json = {
    asset: { version: "2.0", generator: "wall-art client GLB writer" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: "custom-piece" }],
    meshes: [
      {
        name: "custom-piece",
        primitives: [
          {
            attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 },
            indices: 3,
            material: 0,
          },
        ],
      },
    ],
    materials: [
      {
        name: "custom-artwork",
        pbrMetallicRoughness: {
          baseColorTexture: { index: 0 },
          metallicFactor: 0,
          roughnessFactor: 0.85,
        },
        // The wall shows between the letters. MASK rather than BLEND: a cutout
        // needs no depth sorting, which is what keeps it correct from any angle.
        alphaMode: "MASK",
        alphaCutoff: 0.5,
        doubleSided: true,
      },
    ],
    textures: [{ sampler: 0, source: 0 }],
    samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 33071, wrapT: 33071 }],
    images: [{ bufferView: 4, mimeType: "image/png" }],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: 4,
        type: "VEC3",
        // Required on POSITION, and validators reject a file without it.
        // Half-extents in metres: widthCm / 100 / 2.
        min: [-widthCm / 200, -heightCm / 200, 0],
        max: [widthCm / 200, heightCm / 200, 0],
      },
      { bufferView: 1, componentType: 5126, count: 4, type: "VEC3" },
      { bufferView: 2, componentType: 5126, count: 4, type: "VEC2" },
      { bufferView: 3, componentType: 5123, count: 6, type: "SCALAR" },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: vPos.offset, byteLength: vPos.length, target: 34962 },
      { buffer: 0, byteOffset: vNrm.offset, byteLength: vNrm.length, target: 34962 },
      { buffer: 0, byteOffset: vUv.offset, byteLength: vUv.length, target: 34962 },
      { buffer: 0, byteOffset: vIdx.offset, byteLength: vIdx.length, target: 34963 },
      { buffer: 0, byteOffset: vImg.offset, byteLength: vImg.length },
    ],
    buffers: [{ byteLength: binLength }],
  };

  const jsonBytes = new TextEncoder().encode(JSON.stringify(json));
  const jsonPadded = padTo4(jsonBytes.byteLength);
  const total = 12 + 8 + jsonPadded + 8 + binLength;

  const out = new ArrayBuffer(total);
  const view = new DataView(out);
  const bytes = new Uint8Array(out);

  view.setUint32(0, MAGIC, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, total, true);

  view.setUint32(12, jsonPadded, true);
  view.setUint32(16, JSON_CHUNK, true);
  bytes.set(jsonBytes, 20);
  // JSON padding is spaces, not zeros — the spec is explicit about it.
  for (let i = jsonBytes.byteLength; i < jsonPadded; i += 1) bytes[20 + i] = 0x20;

  const binHeader = 20 + jsonPadded;
  view.setUint32(binHeader, binLength, true);
  view.setUint32(binHeader + 4, BIN_CHUNK, true);
  bytes.set(bin, binHeader + 8);

  // Chunked: String.fromCharCode with a whole buffer spread overflows the call
  // stack once the texture is any real size.
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return `data:model/gltf-binary;base64,${btoa(binary)}`;
}
