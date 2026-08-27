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

/**
 * Length of the calibration bar printed on every sheet.
 *
 * Declared here because it was previously a bare `100` in the stylesheet and the
 * words "10 cm" in three separate pieces of copy, a docstring and a gate — six
 * copies of the one number the whole template depends on. This bar is the only
 * mechanism for catching a printer that quietly scaled the page, so a label
 * disagreeing with the bar is worse than having no bar: somebody measures 10cm
 * against a bar drawn at 90mm and concludes the print is correct.
 *
 * 100mm rather than something longer because it has to fit across the printable
 * width of a portrait sheet alongside the sheet label, and rather than something
 * shorter because a 1mm reading error against 100mm is 1%, which is the accuracy
 * the piece needs.
 */
export const RULER_MM = 100;

/** The same bar in centimetres, for copy that speaks to people. */
export const RULER_CM = RULER_MM / 10;

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

/** The part of a piece that carries ink, as fractions of its rectangle. */
export interface InkArea {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * The tiles worth printing, and how many were left out.
 *
 * A piece is cut letters on a bare wall, so a short word in the middle of a large
 * rectangle leaves big empty margins — and tiling the rectangle prints those
 * margins as blank sheets. Measured across every piece and size, 31% of the sheets
 * had no ink on them at all, and Name in Gold at Large was 29 blank out of 35:
 * somebody feeding 35 sheets through a printer for six sheets of content.
 *
 * Omitted tiles keep their row and column numbers in the labels of the ones that
 * remain, so the arrangement is still unambiguous — "row 4 of 5, column 3 of 7"
 * says where a sheet goes whether or not its neighbours were printed.
 *
 * Without an ink area every tile is returned, which prints everything rather than
 * nothing: the wrong direction to fail in is a template missing a piece of the
 * artwork.
 */
export function tiles(
  layout: TileLayout,
  pieceWidthMm?: number,
  pieceHeightMm?: number,
  ink?: InkArea,
): { printed: Tile[]; skipped: number } {
  const all: Tile[] = [];
  for (let row = 0; row < layout.rows; row += 1) {
    for (let col = 0; col < layout.cols; col += 1) {
      all.push({
        index: all.length,
        row,
        col,
        offsetXMm: col * layout.windowWidthMm,
        offsetYMm: row * layout.windowHeightMm,
        lastCol: col === layout.cols - 1,
        lastRow: row === layout.rows - 1,
      });
    }
  }

  if (!ink || !pieceWidthMm || !pieceHeightMm) return { printed: all, skipped: 0 };

  const printed = all.filter((tile) => {
    const x0 = tile.offsetXMm / pieceWidthMm;
    const x1 = (tile.offsetXMm + layout.windowWidthMm) / pieceWidthMm;
    const y0 = tile.offsetYMm / pieceHeightMm;
    const y1 = (tile.offsetYMm + layout.windowHeightMm) / pieceHeightMm;
    // Overlap, not containment: a tile catching any part of the inked area has
    // something on it.
    return x1 > ink.left && x0 < ink.right && y1 > ink.top && y0 < ink.bottom;
  });

  // A piece with no ink cannot happen, but printing nothing would be the worst
  // possible answer if it did.
  if (printed.length === 0) return { printed: all, skipped: 0 };

  return { printed, skipped: all.length - printed.length };
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
export function sheetCount(
  mode: PrintMode,
  layout: TileLayout,
  /** Passed for `full`, so the count on the button is the count that prints. */
  tiled?: { printed: Tile[] },
): number {
  if (mode === "spec") return 1;
  if (mode === "corners") return layout.sheets === 1 ? 1 : 4;
  return tiled ? tiled.printed.length : layout.sheets;
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
