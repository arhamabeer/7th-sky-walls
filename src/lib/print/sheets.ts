/**
 * Paper geometry for the true-size wall templates.
 *
 * Kept as pure arithmetic in its own module for two reasons: the numbers decide
 * how many sheets a visitor is about to feed through a printer, which is worth
 * being able to assert in a test, and the same layout has to be computed twice —
 * once to show the sheet count before anyone commits, and again to lay the
 * sheets out.
 *
 * Everything here is in millimetres. CSS `mm` is a real physical unit when
 * printing, so these numbers reach paper unchanged as long as the browser is
 * not scaling — which is the one thing the calibration ruler on each sheet
 * exists to let someone check.
 */

export interface Paper {
  id: PaperId;
  label: string;
  widthMm: number;
  heightMm: number;
}

export type PaperId = "a4" | "letter";

export const PAPERS: Record<PaperId, Paper> = {
  a4: { id: "a4", label: "A4", widthMm: 210, heightMm: 297 },
  // 8.5 x 11in. Not the local standard, but a specification emailed to a head
  // office is as likely to be printed in one country as another.
  letter: { id: "letter", label: "US Letter", widthMm: 215.9, heightMm: 279.4 },
};

export const PAPER_IDS = Object.keys(PAPERS) as PaperId[];

export function isPaperId(value: unknown): value is PaperId {
  return typeof value === "string" && value in PAPERS;
}

/**
 * Inset from the sheet edge to the printable area.
 *
 * The page box is set to `margin: 0` and this inset is applied as padding
 * instead, so the geometry belongs to this module rather than to whatever the
 * print dialog's margin setting happens to be. 10mm clears the unprintable
 * border of every consumer printer with room to spare, and gives a tab to hold
 * when taping sheets together.
 */
export const SHEET_INSET_MM = 10;

export type SheetOrientation = "portrait" | "landscape";

export interface TileLayout {
  orientation: SheetOrientation;
  /**
   * The artwork window: the printable area minus the inset, minus whatever the
   * caller reserved for labels. Deliberately not the same as the sheet's
   * printable area, which SheetMetrics carries — conflating the two is how a
   * label ends up inside the region that gets trimmed off.
   */
  windowWidthMm: number;
  windowHeightMm: number;
  cols: number;
  rows: number;
  sheets: number;
}

/**
 * Height of the strip along the bottom of a tiled sheet carrying its row,
 * column and sheet number.
 *
 * It has to sit outside the artwork window rather than over it, because the
 * whole point of a tiled template is that the sheets trim on the window's edge
 * and butt together — a label inside the window is a label you cut off. So it
 * comes out of the usable height before the tiling is calculated, which is why
 * the layout takes it as a parameter instead of the sheets drawing it wherever
 * they like.
 */
export const LABEL_STRIP_MM = 14;

function layoutFor(
  widthMm: number,
  heightMm: number,
  paper: Paper,
  orientation: SheetOrientation,
  reserveMm: number,
): TileLayout {
  const sheetW = orientation === "portrait" ? paper.widthMm : paper.heightMm;
  const sheetH = orientation === "portrait" ? paper.heightMm : paper.widthMm;
  const windowWidthMm = sheetW - SHEET_INSET_MM * 2;
  const windowHeightMm = sheetH - SHEET_INSET_MM * 2 - reserveMm;
  const cols = Math.ceil(roundMm(widthMm) / windowWidthMm);
  const rows = Math.ceil(roundMm(heightMm) / windowHeightMm);
  return { orientation, windowWidthMm, windowHeightMm, cols, rows, sheets: cols * rows };
}

/**
 * Guards against a piece whose size is an exact multiple of the tile picking up
 * a final row or column of nothing, which floating-point width in millimetres
 * makes possible: 190 * 3 is 570 in decimal and 570.0000000000001 in binary.
 */
function roundMm(mm: number): number {
  return Math.round(mm * 1000) / 1000;
}

/**
 * Tiling for one piece on one paper size, on whichever sheet orientation needs
 * fewer sheets.
 *
 * Rotating the sheet does not change its area, so the saving is entirely in how
 * the remainder packs — and it is not small. A 200 x 80cm panorama is 33 A4
 * sheets in portrait and 40 in landscape, and the intuition that a wide piece
 * wants wide sheets has it backwards. Hence measuring both rather than picking
 * one, with a tie going to the sheet shaped like the piece because that is the
 * one whose partial sheets are least wasteful to trim.
 */
export function tileLayout(
  widthMm: number,
  heightMm: number,
  paper: Paper,
  reserveMm = 0,
): TileLayout {
  const portrait = layoutFor(widthMm, heightMm, paper, "portrait", reserveMm);
  const landscape = layoutFor(widthMm, heightMm, paper, "landscape", reserveMm);
  if (portrait.sheets !== landscape.sheets) {
    return portrait.sheets < landscape.sheets ? portrait : landscape;
  }
  return widthMm > heightMm ? landscape : portrait;
}

export interface Tile {
  index: number;
  row: number;
  col: number;
  /** Offset of this tile's top-left corner within the piece. */
  offsetXMm: number;
  offsetYMm: number;
  /** Whether the piece reaches this tile's right or bottom edge. */
  lastCol: boolean;
  lastRow: boolean;
}

export function tiles(layout: TileLayout): Tile[] {
  const out: Tile[] = [];
  for (let row = 0; row < layout.rows; row += 1) {
    for (let col = 0; col < layout.cols; col += 1) {
      out.push({
        index: out.length,
        row,
        col,
        offsetXMm: col * layout.windowWidthMm,
        offsetYMm: row * layout.windowHeightMm,
        lastCol: col === layout.cols - 1,
        lastRow: row === layout.rows - 1,
      });
    }
  }
  return out;
}

export const PRINT_MODES = ["spec", "corners", "full"] as const;
export type PrintMode = (typeof PRINT_MODES)[number];

export function isPrintMode(value: unknown): value is PrintMode {
  return typeof value === "string" && (PRINT_MODES as readonly string[]).includes(value);
}

/**
 * How many sheets each mode costs, so the choice can be labelled with its price
 * in paper before anyone commits to it. Full tiling runs from 8 sheets for the
 * smallest piece to 63 for the largest, which is exactly why it is not the
 * default and why the count is on the button.
 */
export function sheetCount(mode: PrintMode, layout: TileLayout): number {
  if (mode === "spec") return 1;
  if (mode === "corners") return layout.sheets === 1 ? 1 : 4;
  return layout.sheets;
}

/** The four corners, in reading order, with the label each sheet carries. */
export const CORNERS = [
  { id: "tl", label: "Top left", x: "left", y: "top" },
  { id: "tr", label: "Top right", x: "right", y: "top" },
  { id: "bl", label: "Bottom left", x: "left", y: "bottom" },
  { id: "br", label: "Bottom right", x: "right", y: "bottom" },
] as const;

/**
 * Length of each arm of a corner rule, in millimetres.
 *
 * Capped so the arms of two opposite corners cannot overlap on a piece smaller
 * than the sheet, which would print two contradictory edges.
 */
export function cornerArmMm(edgeMm: number, printableMm: number): number {
  return Math.min(printableMm - 24, edgeMm / 2, 180);
}
