/**
 * Builds a Quick Look USDZ for one artwork at one physical size.
 *
 * Written against the structure three.js's USDZExporter produces — captured
 * with scripts/ar/dump-reference-usdz.mjs and compared automatically by
 * scripts/ar/validate-usdz.mjs — rather than against a reading of the USD
 * spec. That matters because the output can only be truly proven on a real
 * iPhone, so the safest thing available is to match a widely-used reference
 * implementation exactly.
 *
 * The one deliberate difference is the texture format. three.js re-encodes
 * every texture to PNG; for a 24-piece catalogue at four sizes that runs to
 * well over a hundred megabytes. Quick Look reads JPEG, so JPEG is what we
 * write.
 *
 * Everything is authored in METRES at the finished size, with
 * `metersPerUnit = 1`, which is what makes Quick Look place the piece at its
 * true physical size.
 */
import { zipSync } from "fflate";

const CREATOR = "wall-art-portfolio AR pipeline";

const f = (n) => n.toFixed(7);

/**
 * Rotates a vector by -90 degrees about X: (x, y, z) -> (x, z, -y).
 *
 * AR Quick Look re-orients vertically-anchored content so that the model's
 * local +Y becomes the wall's outward normal — it stands the piece
 * "feet-first" against the wall. Baking this rotation cancels that, mapping
 * the artwork's front (+Z) onto +Y and its up (+Y) onto -Z, so the piece hangs
 * upright and faces the room. Without it the artwork faces into the plaster.
 *
 * The rotation is baked into the vertex data rather than expressed as an
 * xformOp, which keeps the Xform transform identity and therefore identical to
 * the reference structure this file is written against.
 */
const rotX90 = ([x, y, z]) => [x, z, -y];

/**
 * Box geometry in USD terms.
 *
 * Authored in the same convention as the GLB — +Y up, artwork facing +Z, back
 * of the frame at z = 0 — then rotated for Quick Look. After rotation the
 * former back face lies at y = 0, which is the face that meets the wall.
 *
 * Winding is passed through unchanged from the glTF convention — verified
 * against three.js's exporter, which writes indices through untouched.
 *
 * UVs are flipped vertically: glTF puts (0,0) at the top-left of an image,
 * UsdUVTexture puts it at the bottom-left.
 */
function boxUsd(width, height, depth, frameUv) {
  const x = width / 2;
  const y = height / 2;
  const zb = 0;
  const zf = depth;
  const [fu, fvGl] = frameUv;
  const fv = 1 - fvGl;
  const flatUv = [
    [fu, fv],
    [fu, fv],
    [fu, fv],
    [fu, fv],
  ];

  const faces = [
    {
      p: [
        [-x, -y, zf],
        [x, -y, zf],
        [x, y, zf],
        [-x, y, zf],
      ],
      n: [0, 0, 1],
      // glTF [0,1],[1,1],[1,0],[0,0] with V flipped for USD.
      uv: [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ],
    },
    {
      p: [
        [x, -y, zb],
        [-x, -y, zb],
        [-x, y, zb],
        [x, y, zb],
      ],
      n: [0, 0, -1],
      uv: flatUv,
    },
    {
      p: [
        [x, -y, zf],
        [x, -y, zb],
        [x, y, zb],
        [x, y, zf],
      ],
      n: [1, 0, 0],
      uv: flatUv,
    },
    {
      p: [
        [-x, -y, zb],
        [-x, -y, zf],
        [-x, y, zf],
        [-x, y, zb],
      ],
      n: [-1, 0, 0],
      uv: flatUv,
    },
    {
      p: [
        [-x, y, zf],
        [x, y, zf],
        [x, y, zb],
        [-x, y, zb],
      ],
      n: [0, 1, 0],
      uv: flatUv,
    },
    {
      p: [
        [-x, -y, zb],
        [x, -y, zb],
        [x, -y, zf],
        [-x, -y, zf],
      ],
      n: [0, -1, 0],
      uv: flatUv,
    },
  ];

  const points = [];
  const normals = [];
  const sts = [];
  const counts = [];
  const indices = [];

  faces.forEach((face, i) => {
    const base = i * 4;
    face.p.forEach((p) => {
      const r = rotX90(p);
      points.push(`(${f(r[0])}, ${f(r[1])}, ${f(r[2])})`);
    });
    const rn = rotX90(face.n);
    for (let v = 0; v < 4; v++) normals.push(`(${f(rn[0])}, ${f(rn[1])}, ${f(rn[2])})`);
    face.uv.forEach((uv) => sts.push(`(${f(uv[0])}, ${f(uv[1])})`));
    counts.push(3, 3);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  });

  return { points, normals, sts, counts, indices };
}

function header() {
  return `#usda 1.0
(
\tcustomLayerData = {
\t\tstring creator = "${CREATOR}"
\t}
\tdefaultPrim = "Root"
\tmetersPerUnit = 1
\tupAxis = "Y"
)
`;
}

function geometryUsd(geo) {
  return `${header()}
def "Geometry"
{
\tdef Mesh "Geometry"
\t{
\t\tint[] faceVertexCounts = [${geo.counts.join(", ")}]
\t\tint[] faceVertexIndices = [${geo.indices.join(", ")}]
\t\tnormal3f[] normals = [${geo.normals.join(", ")}] (
\t\t\tinterpolation = "vertex"
\t\t)
\t\tpoint3f[] points = [${geo.points.join(", ")}]
\t\ttexCoord2f[] primvars:st = [${geo.sts.join(", ")}] (
\t\t\tinterpolation = "vertex"
\t\t)
\t\tuniform token subdivisionScheme = "none"
\t}
}
`;
}

function modelUsd({ name, textureFile, roughness, alignment }) {
  const M = "Material_0";
  return `${header()}
def Xform "Root"
{
\tdef Scope "Scenes" (
\t\tkind = "sceneLibrary"
\t)
\t{
\t\tdef Xform "Scene" (
\t\t\tcustomData = {
\t\t\t\tbool preliminary_collidesWithEnvironment = 0
\t\t\t\tstring sceneName = "Scene"
\t\t\t}
\t\t\tsceneName = "Scene"
\t\t)
\t\t{
\t\t\ttoken preliminary:anchoring:type = "plane"
\t\t\ttoken preliminary:planeAnchoring:alignment = "${alignment}"

\t\t\tdef Xform "${name}" (
\t\t\t\tprepend references = @./geometries/Geometry.usda@</Geometry>
\t\t\t\tprepend apiSchemas = ["MaterialBindingAPI"]
\t\t\t)
\t\t\t{
\t\t\t\tmatrix4d xformOp:transform = ( (1, 0, 0, 0), (0, 1, 0, 0), (0, 0, 1, 0), (0, 0, 0, 1) )
\t\t\t\tuniform token[] xformOpOrder = ["xformOp:transform"]
\t\t\t\trel material:binding = </Materials/${M}>
\t\t\t}
\t\t}
\t}
}

def "Materials"
{
\tdef Material "${M}"
\t{
\t\ttoken outputs:surface.connect = </Materials/${M}/PreviewSurface.outputs:surface>

\t\tdef Shader "PrimvarReader_diffuse"
\t\t{
\t\t\tuniform token info:id = "UsdPrimvarReader_float2"
\t\t\tfloat2 inputs:fallback = (0.0, 0.0)
\t\t\tstring inputs:varname = "st"
\t\t\tfloat2 outputs:result
\t\t}

\t\tdef Shader "Transform2d_diffuse"
\t\t{
\t\t\tuniform token info:id = "UsdTransform2d"
\t\t\tfloat2 inputs:in.connect = </Materials/${M}/PrimvarReader_diffuse.outputs:result>
\t\t\tfloat inputs:rotation = 0.0000000
\t\t\tfloat2 inputs:scale = (1, 1)
\t\t\tfloat2 inputs:translation = (0, 0)
\t\t\tfloat2 outputs:result
\t\t}

\t\tdef Shader "Texture_diffuse"
\t\t{
\t\t\tuniform token info:id = "UsdUVTexture"
\t\t\tasset inputs:file = @${textureFile}@
\t\t\tfloat2 inputs:st.connect = </Materials/${M}/Transform2d_diffuse.outputs:result>
\t\t\tfloat4 inputs:scale = (1, 1, 1, 1.0)
\t\t\ttoken inputs:sourceColorSpace = "sRGB"
\t\t\ttoken inputs:wrapS = "clamp"
\t\t\ttoken inputs:wrapT = "clamp"
\t\t\tfloat outputs:r
\t\t\tfloat outputs:g
\t\t\tfloat outputs:b
\t\t\tfloat3 outputs:rgb
\t\t}

\t\tdef Shader "PreviewSurface"
\t\t{
\t\t\tuniform token info:id = "UsdPreviewSurface"
\t\t\tcolor3f inputs:diffuseColor.connect = </Materials/${M}/Texture_diffuse.outputs:rgb>
\t\t\tfloat inputs:roughness = ${roughness}
\t\t\tfloat inputs:metallic = 0
\t\t\tfloat inputs:opacity = 1
\t\t\tint inputs:useSpecularWorkflow = 0
\t\t\ttoken outputs:surface
\t\t}
\t}
}
`;
}

/**
 * Packs the USDZ archive.
 *
 * Entries must be STORED (uncompressed) and each file's data aligned to a
 * 64-byte boundary. This reproduces three.js's padding calculation exactly,
 * including its use of assignment rather than accumulation on the final line —
 * matching the reference implementation matters more here than tidying it.
 */
function packUsdz(files) {
  let offset = 0;
  const padded = {};

  for (const filename of Object.keys(files)) {
    const file = files[filename];
    const headerSize = 34 + filename.length;
    offset += headerSize;
    const offsetMod64 = offset & 63;

    if (offsetMod64 !== 4) {
      const padLength = 64 - offsetMod64;
      padded[filename] = [file, { extra: { 12345: new Uint8Array(padLength) } }];
    } else {
      padded[filename] = file;
    }
    offset = file.length;
  }

  return zipSync(padded, { level: 0 });
}

/**
 * @param {object} options
 * @param {Uint8Array|Buffer} options.textureBuffer JPEG from buildArTexture.
 * @param {number} options.widthCm    Finished width.
 * @param {number} options.heightCm   Finished height.
 * @param {number} options.depthCm    Physical depth.
 * @param {[number, number]} options.frameUv UV sampling a flat frame colour.
 * @param {string} options.name       Prim name; USD identifiers are restricted.
 * @param {"vertical"|"horizontal"} options.alignment Plane anchoring.
 * @returns {Uint8Array} USDZ bytes.
 */
export function buildUsdz({
  textureBuffer,
  widthCm,
  heightCm,
  depthCm = 3.5,
  frameUv = [0.5, 0.02],
  name = "Artwork",
  alignment = "vertical",
  roughness = 0.85,
}) {
  const safeName = name.replace(/[^A-Za-z0-9_]/g, "") || "Artwork";
  const primName = /^[0-9]/.test(safeName) ? `_${safeName}` : safeName;

  const geo = boxUsd(widthCm / 100, heightCm / 100, depthCm / 100, frameUv);
  const textureFile = "textures/Texture.jpg";

  const encoder = new TextEncoder();
  const files = {
    "model.usda": encoder.encode(
      modelUsd({ name: primName, textureFile, roughness, alignment }),
    ),
    "geometries/Geometry.usda": encoder.encode(geometryUsd(geo)),
    [textureFile]: new Uint8Array(textureBuffer),
  };

  return packUsdz(files);
}
