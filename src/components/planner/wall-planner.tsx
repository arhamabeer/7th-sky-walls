"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import {
  ARRANGEMENTS,
  EYE_LEVEL_CM,
  planLayout,
  type Arrangement,
  type PlannedPiece,
} from "@/components/planner/layout";
import { WALL_TONES, wallColour, type WallToneId } from "@/content/finishes";
import { cn } from "@/lib/utils";

export interface PlannerArtwork {
  slug: string;
  title: string;
  collection: string;
  imageSrc: string;
  blurDataURL?: string;
  /** The wall this piece is specified for. */
  wallTone: WallToneId;
  sizes: Array<{ id: string; label: string; widthCm: number; heightCm: number }>;
  defaultSizeId: string;
}

interface Selection {
  key: string;
  slug: string;
  sizeId: string;
}

/** Sensible starting wall: a typical commercial feature wall. */
const DEFAULT_WALL = { widthCm: 320, heightCm: 270 };
const MAX_PIECES = 7;

/**
 * Gallery-wall planner.
 *
 * Answers the question that follows "which piece" for anyone furnishing a
 * space rather than a room: how several pieces sit together on one wall. The
 * arrangement is computed in real centimetres and checked against the wall's
 * real dimensions, so the answer is either "it fits" or a specific statement
 * of by how much it does not — never a picture that quietly rescales itself to
 * look right.
 */
export function WallPlanner({ artworks }: { artworks: PlannerArtwork[] }) {
  const fieldId = useId();
  const [wall, setWall] = useState(DEFAULT_WALL);
  /**
   * The wall's own colour, chosen rather than assumed.
   *
   * Necessary now that pieces are cut letters on transparent grounds: a
   * white-lettered piece made for a dark wall is invisible on a pale one, which
   * is a fact about the installation and not something to paper over. Starts on
   * whichever tone the opening selection is mostly specified for.
   */
  const [tone, setTone] = useState<WallToneId>(() => {
    // Open on the tone the seeded pieces are mostly specified for, so the first
    // thing on screen is a correct pairing rather than one the visitor has to
    // fix. Computed from the same seed the selection uses.
    const seeded = artworks.filter((a) => a.collection === artworks[0]?.collection).slice(0, 3);
    const pool = seeded.length >= 2 ? seeded : artworks.slice(0, 3);
    const counts = new Map<WallToneId, number>();
    for (const a of pool) counts.set(a.wallTone, (counts.get(a.wallTone) ?? 0) + 1);
    let best: WallToneId = "light";
    let most = 0;
    for (const [t, n] of counts) if (n > most) { most = n; best = t; }
    return best;
  });
  const [arrangement, setArrangement] = useState<Arrangement["id"]>("row");
  /**
   * Opens with three pieces from one series at the smallest tier, which lands
   * around two-thirds of the default wall. Starting from each piece's own
   * default size produced an arrangement wider than the wall — technically
   * correct behaviour from the planner, but a poor first impression of it.
   */
  const [selection, setSelection] = useState<Selection[]>(() => {
    const firstCollection = artworks[0]?.collection;
    const seed = artworks.filter((a) => a.collection === firstCollection).slice(0, 3);
    const pool = seed.length >= 2 ? seed : artworks.slice(0, 3);
    return pool.map((a, i) => ({
      key: `${a.slug}-${i}`,
      slug: a.slug,
      sizeId: a.sizes[0]?.id ?? a.defaultSizeId,
    }));
  });

  const bySlug = useMemo(
    () => Object.fromEntries(artworks.map((a) => [a.slug, a])),
    [artworks],
  );

  /**
   * Whether the preview can be pinned without hiding its own bottom edge.
   *
   * Sticky positioning pins the top and lets the rest run off the screen, so a
   * preview taller than the viewport becomes a preview whose lower half can
   * never be reached — worse than not pinning it at all. The preview's width is
   * a fraction of the layout and its height follows the wall's ratio, and both
   * the layout width and the viewport height scale together across laptop and
   * desktop sizes, so the ratio is what decides it: about 1.3 of width fits under
   * a 96px offset at every size in the matrix.
   *
   * 1.2 leaves a margin. Walls are usually wider than they are tall, so this
   * holds for almost every wall anybody enters; a narrow pier between two
   * windows is the case it exists for, and there the preview simply scrolls.
   */
  const stickPreview = wall.heightCm / wall.widthCm <= 1.2;

  /**
   * Two pieces from every series, rather than the first twelve in the catalogue.
   *
   * Taking a prefix meant the shortcuts came from the first three series only,
   * and the ones it left out were the worst possible ones to leave out: mirror
   * acrylic is sold as sets of six to twenty-two components the buyer arranges,
   * which is the single clearest reason this planner exists, and it was not
   * offered here at all. Sacred Lines, Brand Walls and the values boards were
   * missing too.
   *
   * Two each keeps the row about the same size as before while covering every
   * series, and the full portfolio is one link away for anything else.
   */
  const addable = useMemo(() => {
    const perSeries = new Map<string, typeof artworks>();
    for (const a of artworks) {
      const list = perSeries.get(a.collection) ?? [];
      if (list.length < 2) perSeries.set(a.collection, [...list, a]);
    }
    return [...perSeries.values()].flat();
  }, [artworks]);

  /** The tone most of the chosen pieces are specified for, as a suggestion. */
  const suggestedTone = useMemo<WallToneId | null>(() => {
    const counts = new Map<WallToneId, number>();
    for (const { slug } of selection) {
      const t = bySlug[slug]?.wallTone;
      if (t) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    let best: WallToneId | null = null;
    let most = 0;
    for (const [t, n] of counts) if (n > most) { most = n; best = t; }
    return best;
  }, [selection, bySlug]);

  const pieces: PlannedPiece[] = useMemo(() => {
    const result: PlannedPiece[] = [];
    for (const { key, slug, sizeId } of selection) {
      const artwork = bySlug[slug];
      if (!artwork) continue;
      const size = artwork.sizes.find((s) => s.id === sizeId) ?? artwork.sizes[0];
      if (!size) continue;
      result.push({
        key,
        slug,
        title: artwork.title,
        imageSrc: artwork.imageSrc,
        blurDataURL: artwork.blurDataURL,
        widthCm: size.widthCm,
        heightCm: size.heightCm,
      });
    }
    return result;
  }, [selection, bySlug]);

  const layout = useMemo(
    () => planLayout(pieces, arrangement, wall.widthCm, wall.heightCm),
    [pieces, arrangement, wall],
  );

  const addPiece = (slug: string) => {
    if (selection.length >= MAX_PIECES) return;
    const artwork = bySlug[slug];
    if (!artwork) return;
    setSelection((prev) => [
      ...prev,
      { key: `${slug}-${Date.now()}`, slug, sizeId: artwork.defaultSizeId },
    ]);
  };

  const removePiece = (key: string) =>
    setSelection((prev) => prev.filter((s) => s.key !== key));

  const setSize = (key: string, sizeId: string) =>
    setSelection((prev) => prev.map((s) => (s.key === key ? { ...s, sizeId } : s)));

  /** The arrangement, written out so it can travel to the inquiry. */
  const inquiryHref = (() => {
    const summary = pieces
      .map((p) => `${p.title} at ${p.widthCm}×${p.heightCm} cm`)
      .join("; ");
    const message = pieces.length
      ? `I've planned a wall arrangement: ${summary}. Wall is ${wall.widthCm} × ${wall.heightCm} cm, ${ARRANGEMENTS.find((a) => a.id === arrangement)?.name.toLowerCase()}.`
      : "";
    const params = new URLSearchParams();
    if (message) params.set("plan", message);
    return `/contact${params.toString() ? `?${params.toString()}` : ""}`;
  })();

  // The global :focus-visible outline is left in place — see inquiry-form for
  // why the accent/40 ring it used to carry was not an adequate indicator.
  const numberInput =
    "mt-1.5 block min-h-12 w-full rounded-lg border border-line bg-background px-4 py-3 text-base focus:border-ink";

  const optionClass = (active: boolean) =>
    cn(
      "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium transition-colors",
      active
        ? "border-ink bg-ink text-background"
        : "border-line bg-surface text-muted hover:border-ink hover:text-ink",
    );

  return (
    <div className="grid gap-10 lg:grid-cols-[1.25fr_1fr] lg:gap-14">
      {/*
        The wall, held in view while the controls beside it are worked through.

        The controls column is roughly twice the height of the preview — a wall
        is wider than it is tall, and there is a size chooser per piece plus a
        shortcut for every series — so on a wide screen the preview scrolled out
        of sight exactly as somebody started changing sizes. Watching the
        arrangement change is the entire feature.

        `lg:` only: stacked on a phone the preview is directly above the control
        it belongs to, and pinning it there would cost the screen space the
        arrangement needs. `top-24` clears the header.
      */}
      <div className={stickPreview ? "lg:sticky lg:top-24 lg:self-start" : undefined}>
        <div
          className="relative w-full overflow-hidden rounded-xl border border-line transition-colors duration-300 motion-reduce:transition-none"
          style={{
            aspectRatio: `${wall.widthCm} / ${wall.heightCm}`,
            backgroundColor: wallColour(tone),
          }}
          role="img"
          aria-label={
            pieces.length
              ? `A ${wall.widthCm} by ${wall.heightCm} centimetre wall with ${pieces.length} pieces arranged as a ${ARRANGEMENTS.find((a) => a.id === arrangement)?.name.toLowerCase()}`
              : "An empty wall"
          }
        >
          {/* Eye-level line, so the convention is visible rather than implied. */}
          <div
            aria-hidden
            className="absolute inset-x-0 border-t border-dashed border-muted/30"
            style={{ bottom: `${(EYE_LEVEL_CM / wall.heightCm) * 100}%` }}
          />

          {layout.placed.map((piece) => (
            <div
              key={piece.key}
              // No ring and no box shadow: these are transparent PNGs of cut
              // letters, and a bordered, shadowed rectangle around one reads as
              // a sheet of paper pinned to the wall. The shadow moves onto the
              // image, where it follows the letters.
              className="absolute transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
              style={{
                width: `${(piece.widthCm / wall.widthCm) * 100}%`,
                height: `${(piece.heightCm / wall.heightCm) * 100}%`,
                left: `${((piece.xCm - piece.widthCm / 2) / wall.widthCm) * 100}%`,
                bottom: `${(piece.bottomCm / wall.heightCm) * 100}%`,
              }}
            >
              <Image
                src={piece.imageSrc}
                alt=""
                fill
                sizes="(min-width: 1024px) 6.5vw, 19vw"
                className="object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.4)]"
                {...(piece.blurDataURL
                  ? { placeholder: "blur" as const, blurDataURL: piece.blurDataURL }
                  : {})}
              />
            </div>
          ))}

          {!pieces.length && (
            <p className="absolute inset-0 flex items-center justify-center px-8 text-center text-sm text-muted">
              Add a piece to start planning this wall.
            </p>
          )}
        </div>

        <p aria-live="polite" className="mt-3 text-sm leading-6 text-muted">
          {pieces.length
            ? `${pieces.length} ${pieces.length === 1 ? "piece" : "pieces"} spanning ${layout.spanWidthCm} × ${layout.spanHeightCm} cm on a ${wall.widthCm} × ${wall.heightCm} cm wall. The dashed line is eye level at ${EYE_LEVEL_CM} cm.`
            : "Everything here is drawn at true relative scale."}
        </p>

        {layout.problems.map((problem) => (
          <p
            key={problem}
            role="status"
            className="mt-3 rounded-lg border border-accent/40 bg-accent/10 p-3 text-sm leading-6"
          >
            {problem}
          </p>
        ))}
      </div>

      {/* Controls */}
      <div className="space-y-8">
        <fieldset className="border-0 p-0">
          <legend className="text-xs font-semibold uppercase tracking-widest text-muted">
            Your wall
          </legend>
          <div className="mt-2 grid grid-cols-2 gap-4">
            <div>
              <label htmlFor={`${fieldId}-w`} className="text-sm font-medium">
                Width (cm)
              </label>
              <input
                id={`${fieldId}-w`}
                type="number"
                min={80}
                max={1200}
                inputMode="numeric"
                value={wall.widthCm}
                onChange={(e) =>
                  setWall((w) => ({
                    ...w,
                    widthCm: Math.min(1200, Math.max(80, Number(e.target.value) || 80)),
                  }))
                }
                className={numberInput}
              />
            </div>
            <div>
              <label htmlFor={`${fieldId}-h`} className="text-sm font-medium">
                Height (cm)
              </label>
              <input
                id={`${fieldId}-h`}
                type="number"
                min={120}
                max={600}
                inputMode="numeric"
                value={wall.heightCm}
                onChange={(e) =>
                  setWall((w) => ({
                    ...w,
                    heightCm: Math.min(600, Math.max(120, Number(e.target.value) || 120)),
                  }))
                }
                className={numberInput}
              />
            </div>
          </div>

          {/* The wall's own colour. Not decoration: these pieces are cut letters
              on a transparent ground, so a pale piece on a pale wall genuinely
              disappears — which is a property of the installation and the reason
              every piece states the wall it is specified for. */}
          <p className="mt-4 text-sm font-medium">Wall colour</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.values(WALL_TONES).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setTone(option.id as WallToneId)}
                aria-pressed={option.id === tone}
                className={cn(optionClass(option.id === tone), "gap-2 pl-3")}
              >
                <span
                  aria-hidden
                  className="h-4 w-4 rounded-full ring-1 ring-black/15"
                  style={{ backgroundColor: option.colour }}
                />
                {option.name}
              </button>
            ))}
          </div>
          {suggestedTone && suggestedTone !== tone && (
            <p className="mt-2 text-xs leading-5 text-muted">
              Most of these pieces are specified for a{" "}
              {WALL_TONES[suggestedTone].name.toLowerCase()}.{" "}
              <button
                type="button"
                onClick={() => setTone(suggestedTone)}
                className="font-semibold text-accent underline underline-offset-4"
              >
                Switch to it
              </button>
              .
            </p>
          )}
        </fieldset>

        <fieldset className="border-0 p-0">
          <legend className="text-xs font-semibold uppercase tracking-widest text-muted">
            Arrangement
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {ARRANGEMENTS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setArrangement(option.id)}
                aria-pressed={option.id === arrangement}
                className={optionClass(option.id === arrangement)}
              >
                {option.name}
              </button>
            ))}
          </div>
          <p className="mt-2 text-sm leading-6 text-muted">
            {ARRANGEMENTS.find((a) => a.id === arrangement)?.description}
          </p>
        </fieldset>

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">
            Pieces on this wall
          </h2>
          <ul className="mt-3 space-y-2">
            {selection.map(({ key, slug, sizeId }) => {
              const artwork = bySlug[slug];
              if (!artwork) return null;
              return (
                <li
                  key={key}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-3"
                >
                  <div
                    className="relative h-12 w-12 shrink-0 overflow-hidden rounded"
                    style={{ backgroundColor: wallColour(artwork.wallTone) }}
                  >
                    <Image
                      src={artwork.imageSrc}
                      alt=""
                      fill
                      sizes="48px"
                      className="object-contain"
                    />
                  </div>
                  <span className="min-w-0 flex-1 text-sm font-medium">
                    {artwork.title}
                  </span>
                  {/* The size picker and remove control wrap to their own line
                      on narrow phones. Kept inline they squeezed the title down
                      to a few unreadable characters. */}
                  <div className="flex w-full items-center gap-2 sm:w-auto">
                    <label className="sr-only" htmlFor={`${fieldId}-size-${key}`}>
                      Size for {artwork.title}
                    </label>
                    <select
                      id={`${fieldId}-size-${key}`}
                      value={sizeId}
                      onChange={(e) => setSize(key, e.target.value)}
                      className="min-h-11 flex-1 rounded-lg border border-line bg-background px-3 text-sm sm:flex-none"
                    >
                      {artwork.sizes.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.widthCm} × {s.heightCm} cm
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removePiece(key)}
                      aria-label={`Remove ${artwork.title} from the wall`}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-ink/5 hover:text-ink"
                    >
                      <span aria-hidden>×</span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          {selection.length >= MAX_PIECES && (
            <p className="mt-2 text-sm text-muted">
              That is as many as this tool plans at once. Larger programmes are
              worth planning from a floor plan with us.
            </p>
          )}
        </div>

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">
            Add a piece
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {addable.map((artwork) => (
              <li key={artwork.slug}>
                <button
                  type="button"
                  onClick={() => addPiece(artwork.slug)}
                  disabled={selection.length >= MAX_PIECES}
                  className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-4 text-sm font-medium text-muted transition-colors hover:border-ink hover:text-ink disabled:opacity-40"
                >
                  {artwork.title}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-muted">
            <Link
              href="/portfolio"
              className="inline-flex min-h-11 items-center font-semibold text-accent underline-offset-4 hover:underline"
            >
              Browse the full portfolio
            </Link>
          </p>
        </div>

        <div className="rounded-xl border border-line bg-surface p-5">
          <p className="text-sm leading-6 text-muted">
            Send us the arrangement and we&apos;ll check it against a photo of
            the actual wall, adjust the spacing, and come back with a mockup
            before anything is produced.
          </p>
          <Link
            href={inquiryHref}
            className="mt-4 inline-flex min-h-12 items-center justify-center rounded-full bg-ink px-6 text-sm font-semibold text-background transition-opacity hover:opacity-85"
          >
            Send this arrangement
          </Link>
        </div>
      </div>
    </div>
  );
}
