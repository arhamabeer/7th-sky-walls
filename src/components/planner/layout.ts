/**
 * Arrangement maths for the gallery-wall planner.
 *
 * Everything is in real-world centimetres, and every arrangement is checked
 * against the actual wall before it is drawn. A planner that silently produces
 * a layout wider than the wall would be worse than no planner at all — the
 * whole reason someone opens this is to find out whether their idea fits.
 */

export interface PlannedPiece {
  key: string;
  slug: string;
  title: string;
  imageSrc: string;
  blurDataURL?: string;
  widthCm: number;
  heightCm: number;
}

export interface PlacedPiece extends PlannedPiece {
  /** Centre of the piece, in centimetres from the left edge of the wall. */
  xCm: number;
  /** Bottom of the piece, in centimetres from the floor. */
  bottomCm: number;
}

export interface Arrangement {
  id: "row" | "grid" | "salon";
  name: string;
  description: string;
}

export const ARRANGEMENTS: Arrangement[] = [
  {
    id: "row",
    name: "Single row",
    description:
      "One line, centres aligned at eye level. The safest arrangement and the easiest to hang straight.",
  },
  {
    id: "grid",
    name: "Two rows",
    description:
      "Balanced rows with matched spacing. Suits corridors and any wall taller than it is wide.",
  },
  {
    id: "salon",
    name: "Salon hang",
    description:
      "Staggered heights around a shared centre line. Looks collected rather than installed — best with mixed sizes.",
  },
];

/* Imported and re-exported: the maths below uses these, and the planner's own
   components already import them from here. The values belong to
   content/hanging, which is the single place each is declared. */
import {
  COMFORTABLE_WALL_SHARE,
  EYE_LEVEL_CM,
  PIECE_GAP_CM,
} from "@/content/hanging";
export { EYE_LEVEL_CM };

const GAP_CM = PIECE_GAP_CM;

export interface LayoutResult {
  placed: PlacedPiece[];
  /** Overall extents of the arrangement, for reporting. */
  spanWidthCm: number;
  spanHeightCm: number;
  /** Problems the customer needs to know about before ordering. */
  problems: string[];
}

function centreRow(
  pieces: PlannedPiece[],
  wallWidthCm: number,
  centreYCm: number,
): { placed: PlacedPiece[]; widthCm: number } {
  const widthCm =
    pieces.reduce((sum, p) => sum + p.widthCm, 0) + GAP_CM * Math.max(0, pieces.length - 1);
  let cursor = (wallWidthCm - widthCm) / 2;
  const placed = pieces.map((piece) => {
    const xCm = cursor + piece.widthCm / 2;
    cursor += piece.widthCm + GAP_CM;
    return { ...piece, xCm, bottomCm: centreYCm - piece.heightCm / 2 };
  });
  return { placed, widthCm };
}

export function planLayout(
  pieces: PlannedPiece[],
  arrangement: Arrangement["id"],
  wallWidthCm: number,
  wallHeightCm: number,
): LayoutResult {
  if (!pieces.length) {
    return { placed: [], spanWidthCm: 0, spanHeightCm: 0, problems: [] };
  }

  let placed: PlacedPiece[] = [];

  if (arrangement === "row") {
    placed = centreRow(pieces, wallWidthCm, EYE_LEVEL_CM).placed;
  } else if (arrangement === "grid") {
    const half = Math.ceil(pieces.length / 2);
    const top = pieces.slice(0, half);
    const bottom = pieces.slice(half);
    const topTallest = Math.max(...top.map((p) => p.heightCm));
    const bottomTallest = bottom.length ? Math.max(...bottom.map((p) => p.heightCm)) : 0;
    // Stack the two rows around eye level with one gap between them.
    const totalHeight = topTallest + (bottom.length ? GAP_CM + bottomTallest : 0);
    const blockBottom = EYE_LEVEL_CM - totalHeight / 2;
    const bottomRowCentre = blockBottom + bottomTallest / 2;
    const topRowCentre = blockBottom + bottomTallest + GAP_CM + topTallest / 2;
    placed = [
      ...centreRow(top, wallWidthCm, bottom.length ? topRowCentre : EYE_LEVEL_CM).placed,
      ...(bottom.length ? centreRow(bottom, wallWidthCm, bottomRowCentre).placed : []),
    ];
  } else {
    // Salon: a row with alternating vertical offsets, so the arrangement reads
    // as collected over time rather than set out with a spirit level.
    const base = centreRow(pieces, wallWidthCm, EYE_LEVEL_CM).placed;
    placed = base.map((piece, i) => {
      const offset = i % 3 === 0 ? 0 : i % 3 === 1 ? 14 : -12;
      return { ...piece, bottomCm: piece.bottomCm + offset };
    });
  }

  const left = Math.min(...placed.map((p) => p.xCm - p.widthCm / 2));
  const right = Math.max(...placed.map((p) => p.xCm + p.widthCm / 2));
  const bottom = Math.min(...placed.map((p) => p.bottomCm));
  const top = Math.max(...placed.map((p) => p.bottomCm + p.heightCm));

  const spanWidthCm = Math.round(right - left);
  const spanHeightCm = Math.round(top - bottom);

  const problems: string[] = [];
  if (spanWidthCm > wallWidthCm) {
    problems.push(
      `This arrangement is ${spanWidthCm} cm wide — ${spanWidthCm - wallWidthCm} cm wider than the wall. Try fewer pieces, smaller sizes, or two rows.`,
    );
  }
  if (top > wallHeightCm) {
    problems.push(
      `The top of the arrangement reaches ${Math.round(top)} cm, above the ${wallHeightCm} cm wall.`,
    );
  }
  if (bottom < 0) {
    problems.push(
      `The lowest piece would sit ${Math.abs(Math.round(bottom))} cm below the floor. Fewer rows or smaller pieces will fix it.`,
    );
  }
  /**
   * Two notes rather than one, because there are two different things to say.
   *
   * At 85% the arrangement has almost no clear wall left, which is a practical
   * problem. Between two thirds and that, it fits comfortably and is simply
   * bigger than the proportion the planner's own advice recommends — and until
   * now the tool said nothing at all in that band, so an arrangement covering
   * 80% of a wall was called a mistake by the notes beside it and accepted in
   * silence by the planner.
   */
  if (!problems.length && spanWidthCm > wallWidthCm * 0.85) {
    problems.push(
      `It fits, but only just — ${Math.round(wallWidthCm - spanWidthCm)} cm of clear wall in total. Arrangements usually look better with more breathing room.`,
    );
  } else if (!problems.length && spanWidthCm > wallWidthCm * COMFORTABLE_WALL_SHARE) {
    problems.push(
      `This spans ${Math.round((spanWidthCm / wallWidthCm) * 100)}% of the wall. Past about two thirds an arrangement starts to lose its impact — fewer pieces at larger sizes usually reads better.`,
    );
  }

  return { placed, spanWidthCm, spanHeightCm, problems };
}
