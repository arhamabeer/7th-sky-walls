/**
 * Options for the text-art configurator.
 *
 * Kept small on purpose. A customer setting words on a wall is choosing a
 * mood, not operating a design tool — three voices, four inks and three
 * grounds cover the range without producing combinations the studio would
 * rather not print.
 */

export interface TypefaceOption {
  id: string;
  name: string;
  /** How it reads, in the studio's words. */
  note: string;
  /** CSS font stack, using the variables loaded in config/fonts.ts. */
  stack: string;
  weight: number;
  italic?: boolean;
  /** Average advance per character in em, used to fit text to the canvas. */
  advance: number;
  letterSpacing: string;
}

export const TYPEFACES: TypefaceOption[] = [
  {
    id: "display",
    name: "Monumental",
    note: "High contrast and confident. The default for short statements.",
    stack: "var(--font-display), Georgia, serif",
    weight: 600,
    advance: 0.55,
    letterSpacing: "-0.01em",
  },
  {
    id: "classical",
    name: "Classical",
    note: "Lighter and older-feeling. Suits verse and longer quotations.",
    stack: "var(--font-script), Georgia, serif",
    weight: 300,
    italic: true,
    advance: 0.45,
    letterSpacing: "0.01em",
  },
  {
    id: "modern",
    name: "Modern",
    note: "Clean and neutral. Works where the room is already busy.",
    stack: "var(--font-body), system-ui, sans-serif",
    weight: 500,
    advance: 0.54,
    letterSpacing: "0.02em",
  },
];

export interface ColourOption {
  id: string;
  name: string;
  value: string;
}

export const INKS: ColourOption[] = [
  { id: "ink", name: "Ink", value: "#191510" },
  { id: "brass", name: "Brass", value: "#8F6830" },
  { id: "dusk", name: "Dusk blue", value: "#33506B" },
  { id: "bone", name: "Bone", value: "#F4EFE6" },
];

export const GROUNDS: ColourOption[] = [
  { id: "ivory", name: "Ivory", value: "#F7F2E9" },
  { id: "stone", name: "Stone", value: "#DED7CA" },
  { id: "ink", name: "Ink", value: "#191510" },
];

export function getTypeface(id: string): TypefaceOption {
  return TYPEFACES.find((t) => t.id === id) ?? TYPEFACES[0];
}

export function getInk(id: string): ColourOption {
  return INKS.find((c) => c.id === id) ?? INKS[0];
}

export function getGround(id: string): ColourOption {
  return GROUNDS.find((c) => c.id === id) ?? GROUNDS[0];
}

/**
 * Relative luminance, used to stop a customer choosing ink and ground that
 * cannot be read apart — a combination the studio would have to query anyway.
 */
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const channels = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Below this the words stop being legible across a room. */
export const MIN_CONTRAST = 3;

/**
 * Font size, in container-width percent, that fits the given lines inside the
 * canvas — constrained by the longest line horizontally and by the number of
 * lines vertically.
 */
export function fitFontSize(
  lines: string[],
  aspect: number,
  advance: number,
): number {
  const longest = Math.max(1, ...lines.map((l) => l.length));
  const byWidth = 82 / (longest * advance);
  const byHeight = (76 / aspect) / (Math.max(1, lines.length) * 1.22);
  return Math.max(3, Math.min(byWidth, byHeight, 26));
}
