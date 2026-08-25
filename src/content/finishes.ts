/**
 * Frame finishes offered on every piece.
 *
 * Kept as presentation data rather than per-artwork content: the same four
 * finishes apply across the catalogue, and the artwork's stated materials
 * determine which one is shown by default.
 *
 * `preview` describes how to draw the finish in the browser. The AR models
 * are generated with each artwork's default finish only — see the note in the
 * configurator — so these values drive the on-screen preview, not the 3D
 * assets.
 */
export interface FrameFinish {
  id: string;
  name: string;
  description: string;
  /** Frame face width as a fraction of the artwork's short edge. */
  widthRatio: number;
  /** Face colour. */
  colour: string;
  /** Inner edge, suggesting depth. */
  innerColour: string;
  /** Matches artworks whose materials name this finish. */
  match: RegExp;
}

export const FRAME_FINISHES: FrameFinish[] = [
  {
    id: "hardwood",
    name: "Floating hardwood",
    description: "Warm, substantial, and the safest choice in a room with wood already in it.",
    widthRatio: 0.035,
    colour: "#4A3624",
    innerColour: "#201811",
    match: /hardwood|wood/i,
  },
  {
    id: "aluminium",
    name: "Slim aluminium",
    description: "A thin, quiet edge that disappears and lets the artwork do the work.",
    widthRatio: 0.018,
    colour: "#C4C6C9",
    innerColour: "#787B7F",
    match: /aluminum|aluminium|metal/i,
  },
  {
    id: "gallery",
    name: "Gallery wrap",
    description: "No frame face at all — the canvas wraps the edge. Contemporary and unobtrusive.",
    widthRatio: 0.008,
    colour: "#EEEAE2",
    innerColour: "#CDC7BC",
    match: /canvas/i,
  },
  {
    id: "black",
    name: "Matte black",
    description: "Hard-edged and graphic. Sharpens work with strong geometry or type.",
    widthRatio: 0.026,
    colour: "#1B1917",
    innerColour: "#000000",
    match: /^$/,
  },
];

export function defaultFinishFor(materials: string[] = []): FrameFinish {
  const text = materials.join(" ");
  return FRAME_FINISHES.find((f) => f.match.source !== "^$" && f.match.test(text)) ?? FRAME_FINISHES[2];
}

export function getFinish(id: string): FrameFinish {
  return FRAME_FINISHES.find((f) => f.id === id) ?? FRAME_FINISHES[2];
}
