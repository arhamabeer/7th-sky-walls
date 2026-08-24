"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { RoomScalePreview } from "@/components/artwork/room-scale-preview";
import { ROOM_SCENES } from "@/components/artwork/room-scenes";
import { aspectClass } from "@/components/ui/aspect";
import { cn } from "@/lib/utils";

export interface SizeOption {
  id: string;
  label: string;
  widthCm: number;
  heightCm: number;
  widthIn: number;
  heightIn: number;
}

/**
 * The interactive half of an artwork page: a stage that switches between the
 * artwork itself and a true-scale room preview, a size selector that drives
 * both, and a fullscreen viewer.
 *
 * Static detail content is passed in as children so it stays server-rendered
 * and crawlable — only the parts that need state live on the client.
 */
export function ArtworkExperience({
  title,
  imageSrc,
  imageAlt,
  imageWidth,
  imageHeight,
  orientation,
  blurDataURL,
  sizes,
  defaultSizeId,
  defaultSceneId,
  sizeNote,
  children,
}: {
  title: string;
  imageSrc: string;
  imageAlt: string;
  /** Intrinsic pixel dimensions — required so the fullscreen viewer reserves
   *  the artwork's real proportions instead of letterboxing it. */
  imageWidth: number;
  imageHeight: number;
  orientation: string;
  blurDataURL?: string;
  sizes: SizeOption[];
  defaultSizeId: string;
  /** Room scene matching the artwork's primary recommended venue. */
  defaultSceneId: string;
  sizeNote: string;
  children: ReactNode;
}) {
  const [sizeId, setSizeId] = useState(defaultSizeId);
  const [sceneId, setSceneId] = useState(defaultSceneId);
  const [view, setView] = useState<"artwork" | "room">("artwork");
  const [zoomed, setZoomed] = useState(false);
  const reduced = useReducedMotion();
  const tabsId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);

  const size = sizes.find((s) => s.id === sizeId) ?? sizes[0];

  /**
   * Size is mirrored in the URL so a configuration can be shared, and adopted
   * back on mount.
   *
   * The read has to happen after mount: this page is statically generated, so
   * query params are not available while rendering on the server, and reading
   * them during the first client render would make the hydrated output differ
   * from the server HTML. Initial state therefore matches the server and the
   * URL value is applied immediately afterwards.
   */
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("size");
    if (!fromUrl || !sizes.some((s) => s.id === fromUrl)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only URL state, read after hydration per the note above
    setSizeId(fromUrl);
  }, [sizes]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (sizeId === defaultSizeId) url.searchParams.delete("size");
    else url.searchParams.set("size", sizeId);
    window.history.replaceState(null, "", url);
  }, [sizeId, defaultSizeId]);

  const closeZoom = useCallback(() => {
    setZoomed(false);
    openerRef.current?.focus();
  }, []);

  // Escape closes the viewer; body scroll is locked while it is open.
  useEffect(() => {
    if (!zoomed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeZoom();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = previous;
    };
  }, [zoomed, closeZoom]);

  const tabClass = (active: boolean) =>
    cn(
      "inline-flex min-h-11 flex-1 items-center justify-center rounded-full px-4 text-sm font-semibold transition-colors",
      active ? "bg-ink text-background" : "text-muted hover:text-ink",
    );

  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
      {/* Stage */}
      <div>
        <div
          role="tablist"
          aria-label="Artwork view"
          className="mb-4 flex gap-1 rounded-full border border-line bg-surface p-1"
        >
          <button
            type="button"
            role="tab"
            id={`${tabsId}-tab-artwork`}
            aria-selected={view === "artwork"}
            aria-controls={`${tabsId}-panel`}
            onClick={() => setView("artwork")}
            className={tabClass(view === "artwork")}
          >
            Artwork
          </button>
          <button
            type="button"
            role="tab"
            id={`${tabsId}-tab-room`}
            aria-selected={view === "room"}
            aria-controls={`${tabsId}-panel`}
            onClick={() => setView("room")}
            className={tabClass(view === "room")}
          >
            See it to scale
          </button>
        </div>

        <div
          id={`${tabsId}-panel`}
          role="tabpanel"
          aria-labelledby={`${tabsId}-tab-${view}`}
        >
          {view === "artwork" ? (
            <button
              ref={openerRef}
              type="button"
              onClick={() => setZoomed(true)}
              aria-label={`View ${title} full screen`}
              className={cn(
                "group relative block w-full overflow-hidden rounded-xl bg-line",
                aspectClass(orientation),
              )}
            >
              <Image
                src={imageSrc}
                alt={imageAlt}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                fetchPriority="high"
                loading="eager"
                className="object-cover"
                {...(blurDataURL ? { placeholder: "blur" as const, blurDataURL } : {})}
              />
              <span
                aria-hidden
                className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-ink/75 px-3 py-1.5 text-xs font-semibold text-background opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                Tap to enlarge
              </span>
            </button>
          ) : (
            <>
              <RoomScalePreview
                imageSrc={imageSrc}
                imageAlt={imageAlt}
                widthCm={size.widthCm}
                heightCm={size.heightCm}
                sceneId={sceneId}
                blurDataURL={blurDataURL}
              />
              <fieldset className="mt-4 border-0 p-0">
                <legend className="text-xs font-semibold uppercase tracking-widest text-muted">
                  Preview in
                </legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ROOM_SCENES.map((scene) => (
                    <button
                      key={scene.id}
                      type="button"
                      onClick={() => setSceneId(scene.id)}
                      aria-pressed={scene.id === sceneId}
                      className={cn(
                        "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium transition-colors",
                        scene.id === sceneId
                          ? "border-ink bg-ink text-background"
                          : "border-line bg-surface text-muted hover:border-ink hover:text-ink",
                      )}
                    >
                      {scene.label}
                    </button>
                  ))}
                </div>
              </fieldset>
            </>
          )}
        </div>
      </div>

      {/* Details */}
      <div>
        {children}

        <div className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted">
            Choose a size
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {sizes.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSizeId(s.id)}
                aria-pressed={s.id === sizeId}
                className={cn(
                  "inline-flex min-h-11 flex-col items-start justify-center rounded-xl border px-4 py-2 text-left transition-colors",
                  s.id === sizeId
                    ? "border-ink bg-ink text-background"
                    : "border-line bg-surface hover:border-ink",
                )}
              >
                <span className="text-sm font-semibold leading-tight">{s.label}</span>
                <span
                  className={cn(
                    "text-xs leading-tight",
                    s.id === sizeId ? "text-background/75" : "text-muted",
                  )}
                >
                  {s.widthCm} × {s.heightCm} cm
                </span>
              </button>
            ))}
          </div>

          <p aria-live="polite" className="mt-3 text-sm text-muted">
            {size.label}: {size.widthCm} × {size.heightCm} cm ({size.widthIn}″ ×{" "}
            {size.heightIn}″).
            {view === "room" && " Preview updates as you change size."}
          </p>
          {view === "artwork" && (
            <button
              type="button"
              onClick={() => setView("room")}
              className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-accent underline-offset-4 hover:underline"
            >
              See it to scale on a wall
              <span aria-hidden>&rarr;</span>
            </button>
          )}
          <p className="mt-2 text-xs leading-5 text-muted">{sizeNote}</p>
        </div>
      </div>

      {/* Fullscreen viewer */}
      <AnimatePresence>
        {zoomed && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/95 p-4 sm:p-8"
            initial={reduced ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.22 }}
            role="dialog"
            aria-modal="true"
            aria-label={`${title}, full screen`}
            onClick={closeZoom}
          >
            <motion.div
              className="relative max-h-full w-full max-w-4xl"
              initial={reduced ? false : { scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={reduced ? undefined : { scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={imageSrc}
                alt={imageAlt}
                width={imageWidth}
                height={imageHeight}
                sizes="100vw"
                className="mx-auto h-auto max-h-[78svh] w-auto rounded-lg object-contain"
                {...(blurDataURL ? { placeholder: "blur" as const, blurDataURL } : {})}
              />
              <p className="mt-3 text-center text-sm text-background/80">
                {title} — {size.widthCm} × {size.heightCm} cm
              </p>
            </motion.div>
            <button
              ref={closeRef}
              type="button"
              onClick={closeZoom}
              aria-label="Close full screen view"
              className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-background/15 text-2xl leading-none text-background transition-colors hover:bg-background/25 sm:right-8 sm:top-8"
            >
              <span aria-hidden>×</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
