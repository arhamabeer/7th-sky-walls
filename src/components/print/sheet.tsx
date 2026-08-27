import type { ReactNode } from "react";
import {
  RULER_CM,
  RULER_MM,
  SHEET_INSET_MM,
  type Paper,
  type SheetOrientation,
} from "@/lib/print/sheets";
import { copy } from "@/content/copy";

/**
 * The printable-sheet primitives.
 *
 * The whole approach rests on one decision: every measurement inside a sheet is
 * a percentage of the sheet, never an absolute length. That lets the same markup
 * be a responsive preview on screen — a box with the paper's aspect ratio,
 * whatever width the viewport allows — and a physically exact sheet on paper,
 * where the box is the paper's real size in millimetres. The composition is
 * identical at both scales because nothing inside knows which one it is in.
 *
 * The alternative, sizing everything in `mm` and scaling the preview down, needs
 * a scale factor, and CSS cannot divide one length by another — so that factor
 * has to come from JavaScript and a resize listener. Percentages need neither.
 */

/** CSS mm per unit, for turning a millimetre measurement into a percentage. */
export interface SheetMetrics {
  paper: Paper;
  orientation: SheetOrientation;
  sheetWidthMm: number;
  sheetHeightMm: number;
  tileWidthMm: number;
  tileHeightMm: number;
}

export function sheetMetrics(paper: Paper, orientation: SheetOrientation): SheetMetrics {
  const sheetWidthMm = orientation === "portrait" ? paper.widthMm : paper.heightMm;
  const sheetHeightMm = orientation === "portrait" ? paper.heightMm : paper.widthMm;
  return {
    paper,
    orientation,
    sheetWidthMm,
    sheetHeightMm,
    tileWidthMm: sheetWidthMm - SHEET_INSET_MM * 2,
    tileHeightMm: sheetHeightMm - SHEET_INSET_MM * 2,
  };
}

const pct = (part: number, whole: number) => `${((part / whole) * 100).toFixed(4)}%`;

/** A millimetre length as a percentage of the tile's width. */
export const acrossTile = (mm: number, m: SheetMetrics) => pct(mm, m.tileWidthMm);
/** A millimetre length as a percentage of the tile's height. */
export const downTile = (mm: number, m: SheetMetrics) => pct(mm, m.tileHeightMm);

/**
 * Base type size, expressed so it lands at the same physical size on a portrait
 * and a landscape sheet.
 *
 * `cqw` is 1% of the sheet's width, and a landscape sheet is 40% wider than a
 * portrait one — so a fixed `cqw` figure would set 9pt type on one and 12.5pt
 * type on the other. Converting a target millimetre size into cqw per
 * orientation keeps it at 3.2mm either way.
 */
const BASE_TYPE_MM = 3.2;

export function sheetCss(m: SheetMetrics): string {
  const { sheetWidthMm, sheetHeightMm, tileWidthMm, tileHeightMm } = m;
  return `
@page { size: ${sheetWidthMm}mm ${sheetHeightMm}mm; margin: 0; }

.tpl-sheet {
  position: relative;
  width: 100%;
  aspect-ratio: ${sheetWidthMm} / ${sheetHeightMm};
  background: #ffffff;
  color: #14161a;
  container-type: inline-size;
  overflow: hidden;
}
.tpl-inset {
  position: absolute;
  left: ${pct(SHEET_INSET_MM, sheetWidthMm)};
  top: ${pct(SHEET_INSET_MM, sheetHeightMm)};
  width: ${pct(tileWidthMm, sheetWidthMm)};
  height: ${pct(tileHeightMm, sheetHeightMm)};
  /* The type size goes here rather than on .tpl-sheet, because an element
     cannot query its own container: a cqw on .tpl-sheet itself looks past it
     for an ancestor container, finds none, and falls back to the viewport. It
     did exactly that — 1% of a 1440px window instead of 1% of a 210mm sheet,
     making every measurement on the page 1.8x too large and pushing the scale
     drawing 40mm off the bottom. .tpl-inset is a descendant, so it resolves
     against the sheet. */
  font-size: ${((BASE_TYPE_MM / sheetWidthMm) * 100).toFixed(4)}cqw;
  line-height: 1.4;
}
/* The ruler is the only element on the page that has to be a specific physical
   length, because its whole purpose is to be measured. */
.tpl-ruler { width: ${acrossTile(RULER_MM, m)}; }

/* On a phone, preview the first sheet only. Twenty-five A4 thumbnails at 393px
   wide are unreadable and unhelpful, and rendering them all put enough
   sub-12px type on the page for Lighthouse to call the document illegible —
   which, as a piece of interface, it was. They are hidden rather than dropped,
   because they still have to print. */
@media (max-width: 639px) {
  .tpl-stack > .tpl-sheet:not(:first-of-type) { display: none; }
}

@media print {
  /* The route is a normal page with the site's header and footer; on paper they
     are neither wanted nor meaningful. */
  [data-site-chrome], [data-print-hide] { display: none !important; }
  html, body { background: #ffffff !important; }
  .tpl-stack { display: block; }
  .tpl-sheet {
    /* Explicit, to undo the small-screen rule above wherever both could match. */
    display: block;
    width: ${sheetWidthMm}mm;
    height: ${sheetHeightMm}mm;
    aspect-ratio: auto;
    break-after: page;
    /* Without this the browser drops backgrounds and the wall tone behind pale
       lettering goes white, taking the lettering with it. */
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
  .tpl-sheet:last-of-type { break-after: auto; }
}
`.trim();
}

export function Sheet({
  children,
  footer,
}: {
  children: ReactNode;
  /** Runs along the bottom of the printable area, beside the ruler. */
  footer: ReactNode;
}) {
  return (
    <section className="tpl-sheet">
      <div className="tpl-inset flex flex-col">
        <div className="min-h-0 flex-1">{children}</div>
        <div className="flex shrink-0 items-end justify-between gap-[2em] border-t border-black/25 pt-[0.6em]">
          <div className="min-w-0 flex-1">{footer}</div>
          <CalibrationRuler />
        </div>
      </div>
    </section>
  );
}

/**
 * A bar that is exactly RULER_MM long on paper.
 *
 * Every sheet carries one, not just the first: sheets get reprinted singly, and
 * a template whose scale cannot be checked is worse than no template, because it
 * is confidently wrong. "Fit to page" is one click away in every print dialog
 * and silently shrinks the page by around 6%, which on a 120cm piece is 7cm.
 */
export function CalibrationRuler() {
  return (
    // The percentage width has to sit on this element, not on the bar inside it.
    // A percentage resolves against the containing block, and this is a flex item
    // of a row spanning the printable area — so 52.6% of it is 100mm. Put the same
    // percentage on a child of a shrink-to-fit wrapper instead and it resolves
    // against a width that was itself derived from the content.
    <div className="tpl-ruler shrink-0">
      <div className="relative h-[1.5em] border-x border-b border-black/70">
        {/* One tick per centimetre, derived so the bar and its ticks cannot
            disagree about how long it is. */}
        {Array.from({ length: RULER_CM - 1 }, (_, i) => i + 1).map((cm) => (
          <span
            key={cm}
            aria-hidden
            className="absolute bottom-0 w-px bg-black/70"
            style={{
              left: `${(cm / RULER_CM) * 100}%`,
              height: cm === RULER_CM / 2 ? "70%" : "38%",
            }}
          />
        ))}
      </div>
      {/* One line, because on a tiled sheet this whole strip is 14mm tall. The
          full explanation lives on screen, where it is read before printing. */}
      <p className="mt-[0.25em] text-[0.85em] leading-tight text-black/70">
        {copy.template.rulerCaption}
      </p>
    </div>
  );
}
