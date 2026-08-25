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
 * Two textures come out of this, because the two platforms are at different
 * stages of the same migration.
 *
 * `alpha` is a transparent PNG of the piece alone. These are cut letters with
 * the wall showing between them, so that is the honest texture: paired with a
 * plane and alphaMode MASK it puts the letters on the visitor's real wall with
 * nothing behind them. model-viewer's renderer and the WebXR path both handle
 * cutout alpha, and it is verifiable without a phone.
 *
 * `opaque` is the artwork composited onto its wall tone with a thin margin —
 * what both platforms used until now. The USDZ keeps it, because Quick Look's
 * handling of cutout alpha cannot be confirmed without an iPhone and shipping it
 * unverified is exactly how the empty-USDZ bug above happened. iOS therefore
 * still answers "how big is this on my wall" while Android answers "what does it
 * look like on my wall", and the split is deliberate rather than an oversight.
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

  const opaque = await sharp({
    create: { width, height, channels: 3, background: wall.colour },
  })
    .composite([{ input: artwork, left: margin, top: margin }])
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();

  // The same layout with nothing behind it. The margin is kept so a piece does
  // not sit hard against the edge of its own plane.
  const alpha = await sharp({
    create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: artwork, left: margin, top: margin }])
    /**
     * Indexed palette, 256 colours.
     *
     * The texture is embedded in every size's GLB, so its weight is multiplied
     * by four per artwork. Measured against the unquantised PNG: a gradient
     * mirror set drops from 268 KB to 71 KB for a mean channel difference of
     * 0.13 out of 255. Dropping to 128 colours saves another 35 KB and starts
     * banding the gradients — worst-case difference of 53 — so 256 is where the
     * line is.
     */
    .png({ compressionLevel: 9, palette: true, colours: 256 })
    .toBuffer();

  // A point centred in the top margin, safely on flat wall colour. Only the
  // box geometry needs it; a plane samples the whole texture.
  const frameUv = [0.5, margin / 2 / height];

  return { opaque, alpha, width, height, frameUv };
}
