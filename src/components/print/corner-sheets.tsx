import {
  Sheet,
  acrossTile,
  downTile,
  type SheetMetrics,
} from "@/components/print/sheet";
import { CORNERS, cornerArmMm } from "@/lib/print/sheets";
import { copy } from "@/content/copy";

/**
 * Four sheets, each carrying one corner of the piece at true size.
 *
 * The cheap way to mark a real footprint on a real wall. Full tiling is exact
 * but costs between eight and sixty-three sheets; four corners cost four, and
 * they give the two things a tape measure alone does not: a true right angle, and
 * the piece's dimensions printed beside the mark so nobody is working from
 * memory halfway up a ladder.
 *
 * The arms are capped by cornerArmMm so that on a piece smaller than two sheets
 * the opposite corners cannot overlap and print two contradictory edges.
 */

export interface CornerSheetsProps {
  metrics: SheetMetrics;
  title: string;
  sizeLabel: string;
  widthCm: number;
  heightCm: number;
  studioName: string;
}

const TICK_EVERY_MM = 10;

export function CornerSheets({
  metrics,
  title,
  sizeLabel,
  widthCm,
  heightCm,
  studioName,
}: CornerSheetsProps) {
  const armX = cornerArmMm(widthCm * 10, metrics.tileWidthMm);
  const armY = cornerArmMm(heightCm * 10, metrics.tileHeightMm);

  return (
    <>
      {CORNERS.map((corner, i) => (
        <Sheet
          key={corner.id}
          footer={
            <div className="text-[0.85em] leading-tight text-black/70">
              <p className="font-semibold text-black/85">
                {title} — {sizeLabel}, {widthCm} × {heightCm} cm
              </p>
              <p>
                {corner.label} corner · sheet {i + 1} of {CORNERS.length} ·{" "}
                {studioName}
              </p>
            </div>
          }
        >
          <div className="relative h-full">
            <CornerRule
              corner={corner}
              armXMm={armX}
              armYMm={armY}
              metrics={metrics}
            />
            <CornerLegend
              corner={corner}
              widthCm={widthCm}
              heightCm={heightCm}
              first={i === 0}
            />
          </div>
        </Sheet>
      ))}
    </>
  );
}

/**
 * The L itself, drawn hard against the printable corner that matches the piece's
 * corner. The inset between the paper edge and the line is deliberate: it leaves
 * a tab to tape without covering the line you are aligning to.
 */
function CornerRule({
  corner,
  armXMm,
  armYMm,
  metrics,
}: {
  corner: (typeof CORNERS)[number];
  armXMm: number;
  armYMm: number;
  metrics: SheetMetrics;
}) {
  const horizontal = {
    [corner.x]: 0,
    [corner.y]: 0,
    width: acrossTile(armXMm, metrics),
    height: "0.55mm",
  } as React.CSSProperties;
  const vertical = {
    [corner.x]: 0,
    [corner.y]: 0,
    width: "0.55mm",
    height: downTile(armYMm, metrics),
  } as React.CSSProperties;

  const ticksX = Math.floor(armXMm / TICK_EVERY_MM);
  const ticksY = Math.floor(armYMm / TICK_EVERY_MM);

  return (
    <div aria-hidden className="absolute inset-0">
      <div className="absolute bg-black" style={horizontal} />
      <div className="absolute bg-black" style={vertical} />

      {Array.from({ length: ticksX }, (_, n) => n + 1).map((n) => (
        <div
          key={`x${n}`}
          className="absolute bg-black/70"
          style={{
            [corner.x]: acrossTile(n * TICK_EVERY_MM, metrics),
            [corner.y]: 0,
            width: "0.3mm",
            height: downTile(n % 5 === 0 ? 6 : 3, metrics),
          }}
        />
      ))}
      {Array.from({ length: ticksY }, (_, n) => n + 1).map((n) => (
        <div
          key={`y${n}`}
          className="absolute bg-black/70"
          style={{
            [corner.y]: downTile(n * TICK_EVERY_MM, metrics),
            [corner.x]: 0,
            height: "0.3mm",
            width: acrossTile(n % 5 === 0 ? 6 : 3, metrics),
          }}
        />
      ))}
    </div>
  );
}

/**
 * Which corner this is, what the edges measure, and — on the first sheet only —
 * how to use the set. Repeating the instructions on all four wastes the space
 * the diagram needs; omitting them entirely assumes the set stays together.
 */
function CornerLegend({
  corner,
  widthCm,
  heightCm,
  first,
}: {
  corner: (typeof CORNERS)[number];
  widthCm: number;
  heightCm: number;
  first: boolean;
}) {
  // Diagonally opposite the rule, so the legend never sits under the lines.
  const place = [
    corner.y === "top" ? "bottom-0" : "top-0",
    corner.x === "left" ? "right-0" : "left-0",
  ].join(" ");

  return (
    <div className={`absolute ${place} max-w-[58%]`}>
      <KeyDiagram corner={corner} />
      <p className="mt-[0.6em] font-display text-[1.5em] font-medium leading-tight">
        {corner.label}
      </p>
      <p className="mt-[0.2em] text-[0.9em] text-black/70">
        {corner.y === "top" ? "Top" : "Bottom"} edge runs {widthCm} cm to the{" "}
        {corner.x === "left" ? "right" : "left"}. {corner.x === "left" ? "Left" : "Right"}{" "}
        edge runs {heightCm} cm {corner.y === "top" ? "down" : "up"}.
      </p>
      {first && (
        <ol className="mt-[0.8em] space-y-[0.3em] text-[0.85em] leading-[1.4] text-black/70">
          {copy.template.cornerHowTo.map((step, n) => (
            <li key={step}>
              {n + 1}. {step}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** A small plan of the piece with this sheet's corner picked out. */
function KeyDiagram({ corner }: { corner: (typeof CORNERS)[number] }) {
  const x = corner.x === "left" ? 0 : 40;
  const y = corner.y === "top" ? 0 : 30;
  return (
    <svg
      viewBox="-2 -2 64 54"
      className="w-[7em]"
      role="img"
      aria-label={`Key: the ${corner.label.toLowerCase()} corner of the piece.`}
    >
      <rect
        x={0}
        y={0}
        width={60}
        height={50}
        fill="none"
        stroke="#14161a"
        strokeWidth={0.8}
        opacity={0.35}
      />
      <rect x={x} y={y} width={20} height={20} fill="#14161a" opacity={0.16} />
      <path
        d={
          corner.x === "left"
            ? `M ${x} ${corner.y === "top" ? y + 20 : y} L ${x} ${corner.y === "top" ? y : y + 20} L ${x + 20} ${corner.y === "top" ? y : y + 20}`
            : `M ${x + 20} ${corner.y === "top" ? y + 20 : y} L ${x + 20} ${corner.y === "top" ? y : y + 20} L ${x} ${corner.y === "top" ? y : y + 20}`
        }
        fill="none"
        stroke="#14161a"
        strokeWidth={2}
      />
    </svg>
  );
}
