import { CalibrationRuler, type SheetMetrics } from "@/components/print/sheet";
import { LABEL_STRIP_MM, tiles, type TileLayout } from "@/lib/print/sheets";
import { copy } from "@/content/copy";

/**
 * The whole piece at true size, tiled across as many sheets as it takes.
 *
 * The exact article, and the expensive one: between eight sheets for the
 * smallest piece and sixty-three for the largest. Which is why the sheet count
 * is on the button that leads here rather than discovered in a print dialog.
 *
 * Each sheet carries the artwork as a flat silhouette rather than in its own
 * colours. The template's job is placement, and a piece lettered in bone for a
 * dark wall would print as nothing at all on white paper — so every piece prints
 * as the same grey mask, which also costs a fraction of the toner a solid one
 * would.
 *
 * This does not reuse the Sheet frame the other two modes use. It cannot: those
 * put their footer inside the printable area, and here the printable area is the
 * thing being trimmed and butt-joined, so the labels have to live in a strip
 * outside it. That strip is subtracted from the usable height before the tiling
 * is computed, in the geometry module, so what is drawn and what was counted
 * cannot drift apart.
 */

export interface TiledSheetsProps {
  metrics: SheetMetrics;
  layout: TileLayout;
  title: string;
  sizeLabel: string;
  widthCm: number;
  heightCm: number;
  imageSrc: string;
  studioName: string;
}

export function TiledSheets({
  metrics,
  layout,
  title,
  sizeLabel,
  widthCm,
  heightCm,
  imageSrc,
  studioName,
}: TiledSheetsProps) {
  const all = tiles(layout);
  // Percentages of the sheet's printable area, which is what .tpl-inset is.
  const windowHeightPct = (layout.windowHeightMm / metrics.tileHeightMm) * 100;
  const stripHeightPct = (LABEL_STRIP_MM / metrics.tileHeightMm) * 100;

  return (
    <>
      {all.map((tile) => (
        <section key={tile.index} className="tpl-sheet">
          <div className="tpl-inset">
            <div
              className="relative overflow-hidden"
              style={{ height: `${windowHeightPct.toFixed(4)}%` }}
            >
              {/* The piece, positioned so this window shows its own slice. Both
                  the image and the outline are laid out against the full piece
                  and clipped, which means the piece's real edge appears on
                  whichever sheets it crosses without anyone working out which
                  ones those are. */}
              <div
                className="absolute"
                style={{
                  left: `${(-tile.offsetXMm / layout.windowWidthMm) * 100}%`,
                  top: `${(-tile.offsetYMm / layout.windowHeightMm) * 100}%`,
                  width: `${((widthCm * 10) / layout.windowWidthMm) * 100}%`,
                  height: `${((heightCm * 10) / layout.windowHeightMm) * 100}%`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageSrc}
                  alt=""
                  aria-hidden
                  className="h-full w-full"
                  // grayscale then brightness(0) collapses any lettering colour
                  // to a black mask while leaving the alpha alone; the opacity
                  // step turns that mask into a legible grey.
                  style={{ filter: "grayscale(1) brightness(0) opacity(0.5)" }}
                />
                <div className="absolute inset-0 border border-black/70" />
              </div>

              <TrimMarks tile={tile} />
            </div>

            <div
              className="flex items-end justify-between gap-[1.5em] pt-[0.5em]"
              style={{ height: `${stripHeightPct.toFixed(4)}%` }}
            >
              <div className="min-w-0 text-[0.85em] leading-tight text-black/70">
                <p className="font-semibold text-black/85">
                  Row {tile.row + 1} of {layout.rows} · Column {tile.col + 1} of{" "}
                  {layout.cols} · sheet {tile.index + 1} of {all.length}
                </p>
                <p className="truncate">
                  {title} — {sizeLabel}, {widthCm} × {heightCm} cm · {studioName}
                  {tile.index === 0 && ` · ${copy.template.trimNote}`}
                </p>
              </div>
              <CalibrationRuler />
            </div>
          </div>
        </section>
      ))}
    </>
  );
}

/**
 * Dashed rules on the edges a neighbouring sheet continues across, and nothing
 * on the edges where the piece simply ends. Cutting an outer edge would be
 * cutting away wall, so it should not be marked as a cut.
 */
function TrimMarks({ tile }: { tile: ReturnType<typeof tiles>[number] }) {
  const dash = "border-black/45";
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {tile.col > 0 && (
        <div className={`absolute inset-y-0 left-0 border-l border-dashed ${dash}`} />
      )}
      {!tile.lastCol && (
        <div className={`absolute inset-y-0 right-0 border-r border-dashed ${dash}`} />
      )}
      {tile.row > 0 && (
        <div className={`absolute inset-x-0 top-0 border-t border-dashed ${dash}`} />
      )}
      {!tile.lastRow && (
        <div className={`absolute inset-x-0 bottom-0 border-b border-dashed ${dash}`} />
      )}
      {/* Which way is up, for the sheet that ends up face down on the floor. */}
      <p className="absolute right-[1mm] top-[1mm] text-[0.75em] font-semibold text-black/35">
        R{tile.row + 1}C{tile.col + 1}
      </p>
    </div>
  );
}
