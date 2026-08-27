/**
 * How a piece is mounted, offered on every artwork.
 *
 * This replaced a set of picture-frame finishes, which were wrong for the
 * product: cut lettering has no frame and no substrate — the letters mount
 * straight onto the wall. What a customer actually chooses is how far off the
 * wall they sit, which decides how much shadow the piece throws and whether
 * the wall can be drilled at all.
 *
 * `shadow` values drive the on-screen preview. AR models are generated at each
 * artwork's default standoff only — see the note in the configurator — so these
 * describe the preview, not the 3D assets.
 */
export interface MountStyle {
  id: string;
  name: string;
  description: string;
  /** Distance off the wall in millimetres — what the shadow is a function of. */
  standoffMm: number;
  /** Shadow offset as a fraction of the piece's short edge. */
  shadowRatio: number;
  /** Shadow blur as a fraction of the piece's short edge. */
  blurRatio: number;
  /** Shadow strength. Deeper standoffs throw a softer, wider, weaker shadow. */
  shadowOpacity: number;
  /**
   * Matches an artwork that names this mounting outright.
   *
   * Checked before `match`, and the reason both exist. `match` infers a mounting
   * from the material, which is right for a piece that does not say — but five of
   * twenty-eight pieces did say, and inference overruled them. Three MDF pieces
   * asking for a backer panel and two mirror pieces asking to sit flush all
   * resolved to a 12mm standoff, so the printed specification sheet named the
   * backer panel on its material row and the standoff on its mounting row, two
   * lines apart, on the page a client forwards for sign-off.
   */
  states: RegExp;
  /** Infers a mounting from the material, for a piece that does not name one. */
  match: RegExp;
}

export const MOUNTS: MountStyle[] = [
  {
    id: "flush",
    name: "Flush mounted",
    description:
      "Letters sit against the wall on tape and silicone. The tightest shadow, no fixings, and nothing to make good afterwards — the right answer on a leased wall.",
    standoffMm: 0,
    shadowRatio: 0.006,
    blurRatio: 0.008,
    shadowOpacity: 0.4,
    states: /flush/i,
    match: /pla|pvc/i,
  },
  {
    id: "standoff-12",
    name: "12 mm standoff",
    description:
      "Raised on hidden spacers so each letter floats and throws a clear shadow. The default: it is the depth at which lettering stops looking applied.",
    standoffMm: 12,
    shadowRatio: 0.016,
    blurRatio: 0.02,
    shadowOpacity: 0.34,
    states: /\b12\s*mm\s+standoff/i,
    match: /acrylic/i,
  },
  {
    id: "standoff-25",
    name: "25 mm standoff",
    description:
      "A deeper float for tall walls and double-height spaces, where a shallow shadow disappears at viewing distance. Needs a wall that takes a fixing.",
    standoffMm: 25,
    shadowRatio: 0.03,
    blurRatio: 0.038,
    shadowOpacity: 0.28,
    states: /\b25\s*mm\s+standoff/i,
    match: /aluminium|aluminum/i,
  },
  {
    id: "backer",
    name: "On a backer panel",
    description:
      "Letters mounted to a single painted panel, then the panel to the wall. One set of fixings instead of ninety, and the piece can be taken down whole and rehung.",
    standoffMm: 18,
    shadowRatio: 0.012,
    blurRatio: 0.016,
    shadowOpacity: 0.36,
    states: /backer/i,
    match: /^$/,
  },
];

export function defaultMountFor(materials: string[] = []): MountStyle {
  const text = materials.join(" ");
  // What the piece says wins over what its material implies.
  const stated = MOUNTS.find((m) => m.states.test(text));
  if (stated) return stated;
  return (
    MOUNTS.find((m) => m.match.source !== "^$" && m.match.test(text)) ??
    MOUNTS[1]
  );
}

export function getMount(id: string): MountStyle {
  return MOUNTS.find((m) => m.id === id) ?? MOUNTS[1];
}

/**
 * The shadow a mounting casts, in whatever unit the short edge is given in.
 *
 * The shadow *is* the mounting: the materials page says so in as many words —
 * depth is how far the letter stands off the wall, which is what casts the
 * shadow. So a preview that does not draw it cannot tell a flush piece from a
 * 25mm float, and the configurator's mounting chooser did exactly that: it
 * changed the caption underneath and nothing else. Measured before believing it,
 * because the preview looked flat and looking has been wrong all day — the pixels
 * that differed between flush and 25mm were confined to a twelve-pixel band at
 * the bottom of a 640px preview, which is the caption.
 *
 * Ratios of the short edge rather than fixed lengths, so a small piece is not
 * given a shadow sized for a large one — and one definition, because the artwork
 * tile and the configurator drawing the same mounting differently is the defect
 * this codebase produces most.
 */
export function mountShadow(id: string, shortEdge: number) {
  const mount = getMount(id);
  return {
    offset: mount.shadowRatio * shortEdge,
    blur: mount.blurRatio * shortEdge,
    opacity: mount.shadowOpacity,
  };
}

/**
 * The wall a piece is specified for.
 *
 * Dimensional lettering is specified with its wall, not independently of it: a
 * white acrylic word is invisible on a white wall, and that is a property of
 * the installation rather than a fault in the piece. The site paints this tone
 * behind every preview so what is shown is what would be installed.
 */
export const WALL_TONES = {
  dark: { id: "dark", name: "Dark wall", colour: "#33363B" },
  light: { id: "light", name: "Light wall", colour: "#EDEAE3" },
  accent: { id: "accent", name: "Accent wall", colour: "#F5C518" },
} as const;

export type WallToneId = keyof typeof WALL_TONES;

export function wallColour(tone: WallToneId): string {
  return WALL_TONES[tone].colour;
}
