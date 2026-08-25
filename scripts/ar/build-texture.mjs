/**
 * Builds the texture used by both the GLB and the USDZ for one artwork.
 *
 * One mesh, one material, one texture. That is not a shortcut: three.js's
 * USDZExporter silently drops meshes carrying a material array, producing a
 * USDZ with no geometry at all, which would have shipped an empty AR
 * experience to every iPhone with nothing short of a real device to reveal it.
 * It also satisfies the guidance that multi-object USDZ scenes can drift off
 * the plane they are anchored to.
 *
 * The artwork is composited onto the wall tone it is specified for, with a thin
 * margin of that tone around it. Two reasons. The tone is what the piece is
 * designed against, so a white-lettered piece stays visible instead of
 * vanishing into a white texture. And the margin gives the box's side faces a
 * UV coordinate that lands on flat colour, which is what keeps the edges from
 * showing a smeared slice of the artwork.
 *
 * KNOWN LIMIT, and the reason this is not the end state. These pieces are cut
 * letters with the wall showing between them, so the honest AR model is a plane
 * with an alpha-masked texture and no panel at all. That needs the geometry
 * switched from a box to a plane, alphaMode MASK in the GLB, and an
 * opacityThreshold on the USDZ shader — and Quick Look's handling of cutout
 * alpha cannot be confirmed without an iPhone. Doing it unverified is precisely
 * how the empty-USDZ bug above happened. It is scoped as Phase 10 work
 * alongside the outstanding device QA. Until then AR answers "how big is this
 * on my wall", which is what it is measured against.
 *
 * The stated size is treated as the FINISHED piece — what actually hangs on the
 * wall. Scale claims then need no asterisk.
 */
import sharp from "sharp";

/**
 * Wall tones, kept in step with WALL_TONES in src/content/finishes.ts and the
 * generator's own table. A piece is specified with its wall, so the AR texture
 * is built against the same one the site shows.
 */
const WALL_TONES = {
  dark: { name: "dark wall", colour: "#33363B" },
  light: { name: "light wall", colour: "#EDEAE3" },
  accent: { name: "accent wall", colour: "#F5C518" },
};

export function wallToneFor(tone) {
  const found = WALL_TONES[tone];
  if (!found) throw new Error(`Unknown wall tone "${tone}"`);
  return found;
}

export async function buildArTexture({ sourcePath, maxEdge = 1024, wall, aspect }) {
  const width = aspect >= 1 ? maxEdge : Math.round(maxEdge * aspect);
  const height = aspect >= 1 ? Math.round(maxEdge / aspect) : maxEdge;

  const shortEdge = Math.min(width, height);
  // A thin margin, not a frame: enough flat colour for the side-face UV to land
  // in, and it reads as the breathing room a mounted piece actually has.
  const margin = Math.max(2, Math.round(shortEdge * 0.02));

  const artWidth = width - margin * 2;
  const artHeight = height - margin * 2;

  // `contain`, never `cover`: cropping a word cloud cuts words off the edge,
  // and the proportions are what the size chart promises. The artwork's aspect
  // already matches the piece, so there is nothing to letterbox.
  const artwork = await sharp(sourcePath)
    .resize(artWidth, artHeight, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer();

  const buffer = await sharp({
    create: { width, height, channels: 3, background: wall.colour },
  })
    .composite([{ input: artwork, left: margin, top: margin }])
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();

  // A point centred in the top margin, safely on flat wall colour.
  const frameUv = [0.5, margin / 2 / height];

  return { buffer, width, height, frameUv };
}
