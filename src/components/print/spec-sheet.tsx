import { Sheet } from "@/components/print/sheet";
import { copy } from "@/content/copy";
import { EYE_LEVEL_CM, EYE_LEVEL_M } from "@/content/hanging";

/**
 * A one-page specification for a single piece at a single size.
 *
 * This is the sheet that earns its paper. Full true-size tiling runs from eight
 * sheets for the smallest piece to sixty-three for the largest, so printing it
 * is a deliberate act; a specification is one page, and it is the artefact a
 * buyer actually needs — the thing forwarded to a facilities manager or a
 * finance approver who was not in the room and will never open the website.
 *
 * So it carries what those people ask for: exact dimensions in both systems, the
 * material and its fire behaviour, how it fixes to the wall, an elevation showing
 * the piece hung at standard height next to a door, and — because every path on
 * this site ends in an inquiry rather than a checkout — what ordering involves.
 */

export interface SpecSheetProps {
  title: string;
  description: string;
  collectionName?: string;
  imageSrc: string;
  imageAlt: string;
  wallColour: string;
  sizeLabel: string;
  widthCm: number;
  heightCm: number;
  widthIn: number;
  heightIn: number;
  materials: Array<{ name: string; spec?: string; fire?: string }>;
  mountLabel: string;
  venues: string[];
  studioName: string;
  studioTagline: string;
  contactEmail: string;
  contactPhone: string;
  pageUrl: string;
}

/* Centre height comes from content/hanging. This file declared its own 150
   while the planner and the room preview both used 145, so the advice on screen
   and the number on the printed sheet disagreed about the same convention. */
/** A standard single doorway, for scale. */
const DOOR_W = 90;
const DOOR_H = 200;

export function SpecSheet({
  title,
  description,
  collectionName,
  imageSrc,
  imageAlt,
  wallColour,
  sizeLabel,
  widthCm,
  heightCm,
  widthIn,
  heightIn,
  materials,
  mountLabel,
  venues,
  studioName,
  studioTagline,
  contactEmail,
  contactPhone,
  pageUrl,
}: SpecSheetProps) {
  const t = copy.template;
  const rows: Array<[string, string]> = [
    [t.rows.size, sizeLabel],
    [t.rows.finished, `${widthCm} × ${heightCm} cm`],
    ["", `${widthIn} × ${heightIn} in`],
    [t.rows.mounting, mountLabel],
    [t.rows.material, materials.map((m) => m.name).join(" · ")],
    [t.rows.hungAt, `${EYE_LEVEL_M} m to centre`],
  ];
  if (venues.length > 0) {
    rows.push([t.rows.suitedTo, venues.join(", ")]);
  }

  const fire = materials.find((m) => m.fire)?.fire;
  // Only the materials the catalogue actually describes. A piece's material list
  // includes mounting choices too, which have a name and nothing to say.
  const specs = materials.filter(
    (m): m is { name: string; spec: string; fire?: string } => Boolean(m.spec),
  );

  return (
    <Sheet
      footer={
        <div className="text-[0.85em] leading-tight text-black/70">
          <p className="font-semibold text-black/85">{studioName}</p>
          <p>
            {contactEmail} · {contactPhone}
          </p>
          <p className="break-all">{pageUrl}</p>
        </div>
      }
    >
      <div className="flex h-full flex-col gap-[1.1em]">
        <header className="flex items-baseline justify-between gap-[1em] border-b border-black/25 pb-[0.6em]">
          <div>
            <p className="text-[1.15em] font-semibold tracking-tight">{studioName}</p>
            <p className="text-[0.85em] text-black/60">{studioTagline}</p>
          </div>
          <p className="shrink-0 text-[0.85em] font-semibold uppercase tracking-[0.18em] text-black/60">
            {t.specHeading}
          </p>
        </header>

        {/* The piece in its own wall tone rather than on white. A piece lettered
            in bone for a dark wall is invisible against paper, and a
            specification that shows nothing is worse than no specification. */}
        <div
          className="relative flex h-[36%] shrink-0 items-center justify-center overflow-hidden"
          style={{ backgroundColor: wallColour }}
        >
          {/* A plain img, not next/image: the optimiser serves a variant sized
              for a screen, and this one is going to paper at up to 300dpi. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt={imageAlt}
            className="max-h-[82%] max-w-[82%] object-contain"
          />
        </div>

        {/* Both columns anchor their last block to the bottom. Without that the
            left column ended halfway down while the elevation floated in the
            middle of the right one, leaving a void through the centre of the page
            that read as a rendering fault rather than as white space. */}
        <div className="flex min-h-0 flex-1 gap-[1.4em]">
          <div className="flex min-w-0 flex-[3] flex-col">
            {/* h2, not h1. On paper the piece's name is the document's
                heading, but this sheet is rendered inside a page that already has
                one, and two h1s is two documents as far as a screen reader is
                concerned. Heading level does not print. */}
            <h2 className="font-display text-[1.9em] font-medium leading-[1.1] tracking-tight">
              {title}
            </h2>
            {collectionName && (
              <p className="mt-[0.2em] text-[0.85em] font-semibold uppercase tracking-[0.18em] text-black/55">
                {collectionName}
              </p>
            )}
            <p className="mt-[0.7em] text-[0.95em] leading-[1.5] text-black/75">
              {description}
            </p>
            {specs.length > 0 && (
              <dl className="mt-[0.7em] text-[0.85em] leading-[1.45] text-black/65">
                {specs.map((m) => (
                  <div key={m.name} className="mt-[0.25em] first:mt-0">
                    <dt className="inline font-semibold text-black/80">{m.name}. </dt>
                    <dd className="inline">{m.spec}</dd>
                  </div>
                ))}
              </dl>
            )}
            {fire && (
              <p className="mt-[0.7em] text-[0.85em] leading-[1.45] text-black/65">
                <span className="font-semibold text-black/80">{t.fireLabel} </span>
                {fire}
              </p>
            )}

            <div className="mt-auto border-t border-black/25 pt-[0.6em]">
              <p className="text-[0.85em] font-semibold uppercase tracking-[0.18em] text-black/60">
                {t.orderTitle}
              </p>
              {/* The step names come from the services copy rather than being
                  restated here, so the sheet cannot describe a process the site
                  no longer follows. */}
              <p className="mt-[0.35em] text-[1em] font-medium">
                {copy.services.process.map((p) => p.step).join("  →  ")}
              </p>
              <p className="mt-[0.3em] text-[0.85em] leading-[1.45] text-black/70">
                {t.orderNote}
              </p>
            </div>
          </div>

          <div className="flex min-w-0 flex-[2] flex-col">
            <dl className="text-[0.9em]">
              {rows.map(([label, value], i) => (
                <div
                  key={`${label}-${i}`}
                  className="flex justify-between gap-[0.8em] border-b border-black/10 py-[0.28em]"
                >
                  <dt className="shrink-0 text-black/55">{label}</dt>
                  <dd className="min-w-0 text-right font-medium">{value}</dd>
                </div>
              ))}
            </dl>
            <ScaleElevation widthCm={widthCm} heightCm={heightCm} />
          </div>
        </div>
      </div>
    </Sheet>
  );
}

/**
 * Height of the elevation block, in multiples of the sheet's base type size.
 *
 * Deliberately em rather than a percentage. A percentage height resolves against
 * the parent's height, and the parent here is content-sized — so the percentage
 * was ignored, the SVG fell back to the intrinsic height of its viewBox, and on a
 * near-square piece that was tall enough to push the whole block off the bottom
 * of the page. The base type size is a fixed physical 3.2mm, so this is 64mm on
 * paper and the same fraction of the sheet on screen.
 */
const ELEVATION_EM = 20;

/**
 * The piece drawn on a wall elevation beside a doorway, both to one scale.
 *
 * An SVG rather than positioned elements, because the viewBox is set in
 * centimetres of real wall — so every coordinate in here is the true dimension
 * and there is no scale factor to get wrong. Fitting it to the sheet is
 * preserveAspectRatio's job.
 */
function ScaleElevation({ widthCm, heightCm }: { widthCm: number; heightCm: number }) {
  const gap = 30;
  const pieceX = DOOR_W + gap;
  const totalW = pieceX + widthCm;
  const pieceBottom = EYE_LEVEL_CM - heightCm / 2;
  const pieceTop = EYE_LEVEL_CM + heightCm / 2;
  const wallH = Math.max(DOOR_H + 30, pieceTop + 18);

  // Line weights and type size in centimetres of wall, so they stay legible
  // whatever the piece's size does to the scale.
  const stroke = totalW / 320;
  const type = wallH / 22;

  return (
    <figure className="mt-auto">
      <svg
        viewBox={`0 0 ${totalW} ${wallH}`}
        style={{ width: "100%", height: `${ELEVATION_EM}em` }}
        preserveAspectRatio="xMidYMax meet"
        role="img"
        aria-label={`Elevation: the piece at ${widthCm} by ${heightCm} centimetres, hung with its centre ${EYE_LEVEL_CM} centimetres above the floor, beside a ${DOOR_W} by ${DOOR_H} centimetre doorway.`}
      >
        <line
          x1={0}
          y1={wallH}
          x2={totalW}
          y2={wallH}
          stroke="#14161a"
          strokeWidth={stroke * 1.6}
        />
        <rect
          x={0}
          y={wallH - DOOR_H}
          width={DOOR_W}
          height={DOOR_H}
          fill="none"
          stroke="#14161a"
          strokeWidth={stroke}
          opacity={0.55}
        />
        <text
          x={DOOR_W / 2}
          y={wallH - DOOR_H / 2}
          fontSize={type}
          textAnchor="middle"
          fill="#14161a"
          opacity={0.6}
        >
          {DOOR_W} × {DOOR_H}
        </text>
        {/* The centre line is what fixes the piece's height on the wall, and the
            number installers actually work to. */}
        <line
          x1={pieceX - gap * 0.6}
          y1={wallH - EYE_LEVEL_CM}
          x2={totalW}
          y2={wallH - EYE_LEVEL_CM}
          stroke="#14161a"
          strokeWidth={stroke * 0.7}
          strokeDasharray={`${stroke * 4} ${stroke * 3}`}
          opacity={0.5}
        />
        <rect
          x={pieceX}
          y={wallH - pieceTop}
          width={widthCm}
          height={heightCm}
          fill="#14161a"
          opacity={0.12}
        />
        <rect
          x={pieceX}
          y={wallH - pieceTop}
          width={widthCm}
          height={heightCm}
          fill="none"
          stroke="#14161a"
          strokeWidth={stroke * 1.4}
        />
        <text
          x={pieceX + widthCm / 2}
          y={wallH - pieceBottom + type * 1.4}
          fontSize={type}
          textAnchor="middle"
          fill="#14161a"
        >
          {widthCm} × {heightCm} cm
        </text>
      </svg>
      <figcaption className="mt-[0.35em] text-[0.8em] leading-tight text-black/60">
        {copy.template.elevationCaption} {copy.template.centreLineLabel}{" "}
        {EYE_LEVEL_M} m.
      </figcaption>
    </figure>
  );
}
