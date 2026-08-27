"use client";

import Image from "next/image";
import { useMemo } from "react";
import { getScene, type ScenePiece } from "@/components/artwork/room-scenes";
import { EYE_LEVEL_CM } from "@/content/hanging";
import { cn } from "@/lib/utils";

/**
 * True-scale room preview.
 *
 * Renders the artwork on a reference wall beside furniture of known height and
 * a person of known height, in a scene matching the kind of space the buyer is fitting
 * out. Scale anxiety is the biggest blocker on large-format art, so this is
 * deliberately literal: the numbers on screen are the numbers that get
 * produced.
 *
 * Every position is expressed in real-world centimetres and converted through
 * a single `fromFloor` helper. That matters — the visible floor band occupies
 * part of the container, so any position measured from the container edge
 * instead of the floor line silently drifts, which is how the artwork ended up
 * overlapping the sofa in an earlier revision.
 */

/** Reference room, in centimetres. */
const WALL_HEIGHT_CM = 280;
const ROOM_WIDTH_CM = 440;
/** Visual depth of the floor in front of the wall, also in centimetres. */
const FLOOR_DEPTH_CM = 26;
const CANVAS_HEIGHT_CM = WALL_HEIGHT_CM + FLOOR_DEPTH_CM;

/* Eye level comes from content/hanging, which is the single place it is
   declared — see the note there about the three numbers this replaced. */
/** Interior-design convention: leave a gap between furniture and artwork. */
const FURNITURE_CLEARANCE_CM = 22;
/** Keep the top edge off the ceiling line. */
const CEILING_MARGIN_CM = 12;

const PERSON = { heightCm: 170, widthCm: 46, xCenterCm: 62 };

const px = (cm: number) => (cm / ROOM_WIDTH_CM) * 100;
const py = (cm: number) => (cm / CANVAS_HEIGHT_CM) * 100;
const fromFloor = (cm: number) => py(FLOOR_DEPTH_CM + cm);

function Piece({ piece }: { piece: ScenePiece }) {
  const base = {
    bottom: `${py(FLOOR_DEPTH_CM)}%`,
    width: `${px(piece.widthCm)}%`,
    height: `${py(piece.heightCm)}%`,
    left: `${px(piece.xCenterCm - piece.widthCm / 2)}%`,
  };

  if (piece.style === "table") {
    // A top slab on thin legs, so the eye reads through it to the wall.
    const topPct = (4 / piece.heightCm) * 100;
    return (
      <div aria-hidden className="absolute" style={base}>
        <div
          className="absolute inset-x-0 top-0 rounded-sm bg-muted/45"
          style={{ height: `${topPct}%` }}
        />
        <div className="absolute bottom-0 left-[7%] w-[5%] bg-muted/35" style={{ top: `${topPct}%` }} />
        <div className="absolute bottom-0 right-[7%] w-[5%] bg-muted/35" style={{ top: `${topPct}%` }} />
      </div>
    );
  }

  if (piece.style === "counter") {
    // A body with a wider overhanging top, which is what makes a block read as
    // a reception desk rather than a plinth.
    const topPct = (6 / piece.heightCm) * 100;
    return (
      <div aria-hidden className="absolute" style={base}>
        <div
          className="absolute inset-x-[3%] bottom-0 rounded-sm bg-muted/32"
          style={{ top: `${topPct}%` }}
        />
        <div
          className="absolute inset-x-0 top-0 rounded-sm bg-muted/48"
          style={{ height: `${topPct}%` }}
        />
      </div>
    );
  }

  if (piece.style === "seating" && piece.seatHeightCm) {
    const seatTopPct = 100 - (piece.seatHeightCm / piece.heightCm) * 100;
    return (
      <div aria-hidden className="absolute" style={base}>
        <div
          className="absolute inset-x-[6%] top-0 rounded-t-lg bg-muted/45"
          style={{ bottom: `${(piece.seatHeightCm / piece.heightCm) * 100 - 6}%` }}
        />
        <div
          className="absolute inset-x-0 bottom-0 rounded-md bg-muted/32"
          style={{ top: `${seatTopPct}%` }}
        />
      </div>
    );
  }

  return <div aria-hidden className="absolute rounded-sm bg-muted/40" style={base} />;
}

export function RoomScalePreview({
  imageSrc,
  imageAlt,
  widthCm,
  heightCm,
  sceneId,
  blurDataURL,
  className,
}: {
  imageSrc: string;
  imageAlt: string;
  widthCm: number;
  heightCm: number;
  sceneId: string;
  blurDataURL?: string;
  className?: string;
}) {
  const scene = getScene(sceneId);

  const art = useMemo(() => {
    /** Tallest thing the artwork must hang clear of in this scene. */
    const tallestFurnitureCm = scene.pieces.reduce(
      (max, p) => Math.max(max, p.heightCm),
      0,
    );

    /**
     * Eye-level centring is the gallery default, but above furniture the piece
     * is raised to clear it — what an installer actually does. Very tall
     * pieces are then pushed back down so the top stays clear of the ceiling.
     */
    let bottomCm = Math.max(
      EYE_LEVEL_CM - heightCm / 2,
      tallestFurnitureCm + FURNITURE_CLEARANCE_CM,
    );
    const maxTopCm = WALL_HEIGHT_CM - CEILING_MARGIN_CM;
    if (bottomCm + heightCm > maxTopCm) {
      bottomCm = Math.max(0, maxTopCm - heightCm);
    }

    // A piece wider than the reference wall is clamped so it stays visible.
    const drawWidthCm = Math.min(widthCm, ROOM_WIDTH_CM * 0.9);
    const drawHeightCm = heightCm * (drawWidthCm / widthCm);
    const maxLeftCm = ROOM_WIDTH_CM - drawWidthCm - 6;
    const leftCm = Math.min(Math.max(scene.focusXCm - drawWidthCm / 2, 6), maxLeftCm);

    return {
      widthPct: px(drawWidthCm),
      heightPct: py(drawHeightCm),
      leftPct: px(leftCm),
      bottomPct: fromFloor(bottomCm),
    };
  }, [widthCm, heightCm, scene]);

  return (
    <figure className={cn("m-0", className)}>
      <div
        className="relative w-full overflow-hidden rounded-xl border border-line bg-[color-mix(in_srgb,var(--brand-line)_40%,white)]"
        style={{ aspectRatio: `${ROOM_WIDTH_CM} / ${CANVAS_HEIGHT_CM}` }}
        role="img"
        /*
          The person's height comes from PERSON, not from a number typed here.
          This is the sentence a screen reader user is given the scale in, and
          they have no way to notice it disagreeing with the drawing — so it
          cannot be a second copy of the figure.
        */
        aria-label={`${imageAlt}, shown at ${widthCm} by ${heightCm} centimetres in ${scene.label.toLowerCase()}, beside ${scene.reference} and a ${PERSON.heightCm} centimetre tall person for scale`}
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

        {/* Person silhouette — the scale reference; height comes from PERSON */}
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
          <div className="h-[12%] w-[38%] rounded-full bg-current" />
          <div className="-mt-[1%] h-[42%] w-[80%] rounded-t-[45%] bg-current" />
          <div className="h-[47%] w-[54%] rounded-b-md bg-current" />
        </div>

        {scene.pieces.map((piece, i) => (
          <Piece key={`${scene.id}-${i}`} piece={piece} />
        ))}

        {/* The artwork, at true relative scale */}
        <div
          className="absolute transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
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
            sizes="(min-width: 1024px) 8vw, 20vw"
            // drop-shadow, not a shadow on the wrapper: these are transparent
            // PNGs of cut letters, and a shadowed rectangle around one reads as
            // paper on the wall. Fourth place this same mistake appeared, which
            // is why the responsive audit now checks for it everywhere.
            className="object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.42)]"
            {...(blurDataURL ? { placeholder: "blur" as const, blurDataURL } : {})}
          />
        </div>
      </div>
      <figcaption className="mt-2 text-xs leading-5 text-muted">
        Shown to scale at {widthCm} × {heightCm} cm in {scene.label.toLowerCase()},
        beside {scene.reference} and a {PERSON.heightCm} cm person.
      </figcaption>
    </figure>
  );
}
