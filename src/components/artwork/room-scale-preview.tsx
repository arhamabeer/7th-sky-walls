"use client";

import Image from "next/image";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

/**
 * True-scale room preview.
 *
 * Renders the artwork on a reference wall alongside objects of known height —
 * a 170cm person, an 85cm sofa — so a buyer can judge size before ordering.
 *
 * Every position is expressed in real-world centimetres and converted through
 * a single `fromFloor` helper. That matters: the visible floor band occupies
 * part of the container, so any position measured from the container edge
 * instead of the floor line silently drifts, which is how the artwork ended up
 * overlapping the sofa in an earlier revision.
 *
 * Scale anxiety is the biggest blocker on large-format art, so this is
 * deliberately literal rather than decorative: the numbers on screen are the
 * numbers that get produced.
 */

/** Reference room, in centimetres. */
const WALL_HEIGHT_CM = 280;
const ROOM_WIDTH_CM = 440;
/** Visual depth of the floor in front of the wall, also in centimetres. */
const FLOOR_DEPTH_CM = 26;
/** Total vertical extent the container represents. */
const CANVAS_HEIGHT_CM = WALL_HEIGHT_CM + FLOOR_DEPTH_CM;

/** Gallery convention: hang so the artwork's centre sits at eye level. */
const EYE_LEVEL_CM = 145;
/** Interior-design convention: leave a gap between furniture and artwork. */
const FURNITURE_CLEARANCE_CM = 22;
/** Keep the top edge off the ceiling line. */
const CEILING_MARGIN_CM = 12;

const PERSON = { heightCm: 170, widthCm: 46, xCenterCm: 62 };
const SOFA = { widthCm: 210, heightCm: 85, xCenterCm: 280 };

/** Horizontal position as a percentage of the room width. */
const px = (cm: number) => (cm / ROOM_WIDTH_CM) * 100;
/** Vertical size as a percentage of the canvas height. */
const py = (cm: number) => (cm / CANVAS_HEIGHT_CM) * 100;
/** Distance from the container bottom for something standing on the floor. */
const fromFloor = (cm: number) => py(FLOOR_DEPTH_CM + cm);

export function RoomScalePreview({
  imageSrc,
  imageAlt,
  widthCm,
  heightCm,
  blurDataURL,
  className,
}: {
  imageSrc: string;
  imageAlt: string;
  widthCm: number;
  heightCm: number;
  blurDataURL?: string;
  className?: string;
}) {
  const art = useMemo(() => {
    /**
     * Hanging height. Eye-level centring is the gallery default, but above
     * furniture the piece is raised to clear the sofa back — what an installer
     * actually does. Very tall pieces are then pushed back down so the top
     * edge stays clear of the ceiling.
     */
    let bottomCm = Math.max(
      EYE_LEVEL_CM - heightCm / 2,
      SOFA.heightCm + FURNITURE_CLEARANCE_CM,
    );
    const maxTopCm = WALL_HEIGHT_CM - CEILING_MARGIN_CM;
    if (bottomCm + heightCm > maxTopCm) {
      bottomCm = Math.max(0, maxTopCm - heightCm);
    }

    // A piece wider than the reference wall is clamped so it stays visible.
    const drawWidthCm = Math.min(widthCm, ROOM_WIDTH_CM * 0.9);
    const drawHeightCm = heightCm * (drawWidthCm / widthCm);
    const maxLeftCm = ROOM_WIDTH_CM - drawWidthCm - 6;
    const leftCm = Math.min(Math.max(SOFA.xCenterCm - drawWidthCm / 2, 6), maxLeftCm);

    return {
      widthPct: px(drawWidthCm),
      heightPct: py(drawHeightCm),
      leftPct: px(leftCm),
      bottomPct: fromFloor(bottomCm),
    };
  }, [widthCm, heightCm]);

  return (
    <figure className={cn("m-0", className)}>
      <div
        className="relative w-full overflow-hidden rounded-xl border border-line bg-[color-mix(in_srgb,var(--brand-line)_40%,white)]"
        style={{ aspectRatio: `${ROOM_WIDTH_CM} / ${CANVAS_HEIGHT_CM}` }}
        role="img"
        aria-label={`${imageAlt}, shown at ${widthCm} by ${heightCm} centimetres on a wall beside a 170 centimetre tall person and an 85 centimetre tall sofa for scale`}
      >
        {/* Floor plane and skirting */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 bg-[color-mix(in_srgb,var(--brand-muted)_20%,white)]"
          style={{ height: `${py(FLOOR_DEPTH_CM)}%` }}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bg-line"
          style={{ bottom: `${py(FLOOR_DEPTH_CM)}%`, height: "1.4%" }}
        />

        {/* Person silhouette — 170cm reference */}
        <div
          aria-hidden
          className="absolute flex flex-col items-center text-muted/45"
          style={{
            bottom: `${py(FLOOR_DEPTH_CM)}%`,
            height: `${py(PERSON.heightCm)}%`,
            width: `${px(PERSON.widthCm)}%`,
            left: `${px(PERSON.xCenterCm - PERSON.widthCm / 2)}%`,
          }}
        >
          {/* Head, shoulders-to-hip, then tapered legs, so the figure reads as
              a person rather than a stack of blocks. */}
          <div className="h-[12%] w-[38%] rounded-full bg-current" />
          <div className="-mt-[1%] h-[42%] w-[80%] rounded-t-[45%] bg-current" />
          <div className="h-[47%] w-[54%] rounded-b-md bg-current" />
        </div>

        {/* Sofa silhouette — 85cm reference */}
        <div
          aria-hidden
          className="absolute"
          style={{
            bottom: `${py(FLOOR_DEPTH_CM)}%`,
            width: `${px(SOFA.widthCm)}%`,
            height: `${py(SOFA.heightCm)}%`,
            left: `${px(SOFA.xCenterCm - SOFA.widthCm / 2)}%`,
          }}
        >
          <div className="absolute inset-x-0 bottom-0 top-[30%] rounded-md bg-muted/32" />
          <div className="absolute inset-x-[7%] bottom-[36%] top-0 rounded-t-lg bg-muted/45" />
        </div>

        {/* The artwork, at true relative scale */}
        <div
          className="absolute shadow-[0_12px_30px_-14px_rgba(0,0,0,0.55)] ring-1 ring-black/10 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          style={{
            width: `${art.widthPct}%`,
            height: `${art.heightPct}%`,
            left: `${art.leftPct}%`,
            bottom: `${art.bottomPct}%`,
          }}
        >
          <Image
            src={imageSrc}
            alt=""
            fill
            sizes="(min-width: 1024px) 40vw, 80vw"
            className="object-cover"
            {...(blurDataURL ? { placeholder: "blur" as const, blurDataURL } : {})}
          />
        </div>
      </div>
      <figcaption className="mt-2 text-xs leading-5 text-muted">
        Shown to scale at {widthCm} × {heightCm} cm, hung at gallery eye level
        beside a 170 cm person and an 85 cm sofa.
      </figcaption>
    </figure>
  );
}
