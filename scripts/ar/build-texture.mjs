/**
 * Builds the texture used by both the GLB and the USDZ for one artwork.
 *
 * The frame is composited INTO the texture rather than modelled as separate
 * geometry with its own material. That is not a shortcut — three.js's
 * USDZExporter silently drops meshes that carry a material array, producing a
 * USDZ with no geometry at all, which would have shipped an empty AR
 * experience to every iPhone with nothing to reveal it short of a real device.
 * One mesh, one material, one texture avoids that entire class of failure and
 * also satisfies the guidance that multi-object USDZ scenes can drift off the
 * plane they are anchored to.
 *
 * The stated size is treated as the FINISHED piece — what actually hangs on
 * the wall — with the frame drawn inside it. Scale claims then need no
 * asterisk.
 */
import sharp from "sharp";

/** Frame treatments inferred from an artwork's stated materials. */
const FRAME_STYLES = [
  {
    name: "hardwood",
    match: /hardwood|wood/i,
    /** Frame width as a fraction of the piece's short edge. */
    widthRatio: 0.035,
    colour: { r: 74, g: 54, b: 36 },
    /** Inner shadow line, suggesting the float gap of a floating frame. */
    inner: { r: 32, g: 24, b: 17 },
  },
  {
    name: "aluminium",
    match: /aluminum|aluminium|metal/i,
    widthRatio: 0.018,
    colour: { r: 196, g: 198, b: 201 },
    inner: { r: 120, g: 123, b: 127 },
  },
  {
    name: "canvas",
    match: /canvas/i,
    // A gallery-wrapped canvas has no visible frame face, just the wrapped edge.
    widthRatio: 0.008,
    colour: { r: 238, g: 234, b: 226 },
    inner: { r: 205, g: 199, b: 188 },
  },
];

export function frameStyleFor(materials = []) {
  const text = materials.join(" ");
  return FRAME_STYLES.find((f) => f.match.test(text)) ?? FRAME_STYLES[2];
}

/**
 * @param {object} options
 * @param {string} options.sourcePath   Artwork image on disk.
 * @param {number} options.maxEdge      Longest edge of the output texture.
 * @param {object} options.frame        Result of frameStyleFor().
 * @param {number} options.aspect       width / height of the finished piece.
 * @returns {Promise<{buffer: Buffer, width: number, height: number, frameUv: [number, number]}>}
 *   The texture, plus a UV coordinate that lands inside the frame border —
 *   used to pin the box's side faces to a flat frame colour.
 */
export async function buildArTexture({ sourcePath, maxEdge = 1024, frame, aspect }) {
  const width = aspect >= 1 ? maxEdge : Math.round(maxEdge * aspect);
  const height = aspect >= 1 ? Math.round(maxEdge / aspect) : maxEdge;

  const shortEdge = Math.min(width, height);
  const border = Math.max(2, Math.round(shortEdge * frame.widthRatio));
  const innerLine = Math.max(1, Math.round(border * 0.18));

  const artWidth = width - border * 2;
  const artHeight = height - border * 2;

  const artwork = await sharp(sourcePath)
    .resize(artWidth, artHeight, { fit: "cover", position: "centre" })
    .toBuffer();

  // Frame face, then a darker inner line, then the artwork on top.
  const innerW = artWidth + innerLine * 2;
  const innerH = artHeight + innerLine * 2;

  const buffer = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: frame.colour,
    },
  })
    .composite([
      {
        input: {
          create: { width: innerW, height: innerH, channels: 3, background: frame.inner },
        },
        left: border - innerLine,
        top: border - innerLine,
      },
      { input: artwork, left: border, top: border },
    ])
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();

  // A point centred in the top border, safely inside the frame face.
  const frameUv = [0.5, border / 2 / height];

  return { buffer, width, height, frameUv };
}
