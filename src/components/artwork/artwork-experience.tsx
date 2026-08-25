"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { RoomScalePreview } from "@/components/artwork/room-scale-preview";
import { ROOM_SCENES } from "@/components/artwork/room-scenes";
import { ArPanel } from "@/components/ar/ar-panel";
import {
  TextArtConfigurator,
  type TextArtConfig,
} from "@/components/artwork/text-art-configurator";
import { LinkButton } from "@/components/ui/link-button";
import { useFocusTrap } from "@/components/ui/use-focus-trap";
import { wallColour, type WallToneId } from "@/content/finishes";
import { whatsappLink } from "@/config/site.config";
import { artworkInquiryMessage, copy } from "@/content/copy";
import { cn } from "@/lib/utils";

export interface SizeOption {
  id: string;
  label: string;
  widthCm: number;
  heightCm: number;
  widthIn: number;
  heightIn: number;
  /** Present only when AR assets have been generated for this size. */
  ar?: { glb: string; usdz: string };
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
  wallTone,
  imageAlt,
  imageWidth,
  imageHeight,
  blurDataURL,
  sizes,
  defaultSizeId,
  defaultSceneId,
  defaultFinishId,
  customisable,
  defaultText,
  aspect,
  slug,
  sizeNote,
  children,
}: {
  title: string;
  imageSrc: string;
  /** The wall this piece is specified for — painted behind it everywhere. */
  wallTone: WallToneId;
  imageAlt: string;
  /** Intrinsic pixel dimensions — required so the fullscreen viewer reserves
   *  the artwork's real proportions instead of letterboxing it. */
  imageWidth: number;
  imageHeight: number;
  blurDataURL?: string;
  sizes: SizeOption[];
  defaultSizeId: string;
  /** Room scene matching the artwork's primary recommended venue. */
  defaultSceneId: string;
  /** Frame finish inferred from the artwork's stated materials. */
  defaultFinishId: string;
  /** Text pieces can be reset with the customer's own words. */
  customisable: boolean;
  /** Starting text for the configurator — the piece's own words. */
  defaultText: string;
  /** width / height of the finished piece. */
  aspect: number;
  slug: string;
  sizeNote: string;
  children: ReactNode;
}) {
  const [sizeId, setSizeId] = useState(defaultSizeId);
  const [sceneId, setSceneId] = useState(defaultSceneId);
  const [view, setView] = useState<"artwork" | "room" | "ar" | "custom">("artwork");
  const [config, setConfig] = useState<TextArtConfig | null>(null);
  const [zoomed, setZoomed] = useState(false);
  /**
   * Drives the enter transition. The dialog mounts hidden and is revealed on
   * the next frame so CSS has two states to animate between — the same trick
   * the reveal component uses, and the reason this needs no animation library.
   */
  const [zoomVisible, setZoomVisible] = useState(false);
  const tabsId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const zoomRef = useRef<HTMLDivElement>(null);

  const size = sizes.find((s) => s.id === sizeId) ?? sizes[0];

  /**
   * AR events go to whatever analytics layer is present. Handoff AR is the
   * step of the funnel most likely to fail silently — the platform viewers can
   * break without any change on our side — so launches and failures are
   * recorded rather than assumed.
   */
  const trackAr = useCallback((event: string, detail?: Record<string, unknown>) => {
    const w = window as typeof window & {
      gtag?: (command: string, name: string, params?: Record<string, unknown>) => void;
    };
    w.gtag?.("event", event, detail);
  }, []);

  /**
   * Selecting a size with no generated AR assets must not leave the panel
   * showing another size's model. Derived rather than corrected in an effect,
   * so there is never a frame where the wrong model is on screen.
   */
  const activeView = view === "ar" && !size.ar ? "room" : view;

  /**
   * The configuration travels to the inquiry form as query parameters rather
   * than as a serialised blob, so the studio can read it straight from the URL
   * in a support conversation and the customer can share the link.
   */
  const customInquiryHref = (() => {
    const params = new URLSearchParams({ artwork: slug, size: sizeId });
    if (config) {
      if (config.text.trim()) params.set("text", config.text.trim().slice(0, 200));
      params.set("typeface", config.typeface);
      params.set("ink", config.ink);
      params.set("ground", config.ground);
      params.set("finish", config.finish);
    }
    return `/contact?${params.toString()}`;
  })();

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
    setZoomVisible(false);
    setZoomed(false);
    openerRef.current?.focus();
  }, []);

  // Escape closes the viewer; body scroll is locked while it is open. The
  // reveal is deferred one frame so the CSS transition has a start state.
  useEffect(() => {
    if (!zoomed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeZoom();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    closeRef.current?.focus();
    const frame = requestAnimationFrame(() => setZoomVisible(true));
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = previous;
    };
  }, [zoomed, closeZoom]);

  // aria-modal="true" claims focus cannot leave; this is what makes that true.
  useFocusTrap(zoomRef, zoomed);

  /**
   * Tabs wrap to two rows on the narrowest phones. With four views the strip
   * cannot fit on one line at 320px, and a horizontally scrolled tab bar hides
   * options behind a gesture people do not always discover.
   */
  const tabClass = (active: boolean) =>
    cn(
      "inline-flex min-h-11 flex-1 basis-[calc(50%-0.25rem)] items-center justify-center",
      "rounded-full px-3 text-sm font-semibold transition-colors sm:basis-auto sm:px-4",
      active ? "bg-ink text-background" : "text-muted hover:text-ink",
    );

  return (
    <div
      className={cn(
        "grid gap-10 lg:gap-14",
        // The configurator needs the full width: its preview and its controls
        // are each about as wide as the whole stage column would be.
        activeView === "custom" ? "grid-cols-1" : "lg:grid-cols-2",
      )}
    >
      {/* Stage */}
      <div>
        <div
          role="tablist"
          aria-label="Artwork view"
          className="mb-4 flex flex-wrap gap-1 rounded-3xl border border-line bg-surface p-1 sm:rounded-full"
        >
          <button
            type="button"
            role="tab"
            id={`${tabsId}-tab-artwork`}
            aria-selected={activeView === "artwork"}
            aria-controls={`${tabsId}-panel`}
            onClick={() => setView("artwork")}
            className={tabClass(activeView === "artwork")}
          >
            Artwork
          </button>
          <button
            type="button"
            role="tab"
            id={`${tabsId}-tab-room`}
            aria-selected={activeView === "room"}
            aria-controls={`${tabsId}-panel`}
            onClick={() => setView("room")}
            className={tabClass(activeView === "room")}
          >
            To scale
          </button>
          {customisable && (
            <button
              type="button"
              role="tab"
              id={`${tabsId}-tab-custom`}
              aria-selected={activeView === "custom"}
              aria-controls={`${tabsId}-panel`}
              onClick={() => setView("custom")}
              className={tabClass(activeView === "custom")}
            >
              Make it yours
            </button>
          )}
          {/* Only offered when AR assets exist for the selected size. */}
          {size.ar && (
            <button
              type="button"
              role="tab"
              id={`${tabsId}-tab-ar`}
              aria-selected={activeView === "ar"}
              aria-controls={`${tabsId}-panel`}
              onClick={() => setView("ar")}
              className={tabClass(activeView === "ar")}
            >
              On your wall
            </button>
          )}
        </div>

        <div
          id={`${tabsId}-panel`}
          role="tabpanel"
          aria-labelledby={`${tabsId}-tab-${activeView}`}
        >
          {activeView === "artwork" ? (
            /* Height is capped rather than driven purely by aspect ratio.
               Below the two-column breakpoint a 3:4 piece at full width runs
               past a tablet screen, so the title and details sat below a
               scroll of image. */
            <button
              ref={openerRef}
              type="button"
              onClick={() => setZoomed(true)}
              aria-label={`View ${title} full screen`}
              className="group relative flex max-h-[72svh] w-full items-center justify-center overflow-hidden rounded-xl border border-line p-6 sm:p-8"
              style={{ backgroundColor: wallColour(wallTone) }}
            >
              <Image
                src={imageSrc}
                alt={imageAlt}
                width={imageWidth}
                height={imageHeight}
                sizes="(min-width: 1024px) 50vw, 100vw"
                fetchPriority="high"
                loading="eager"
                className="h-auto max-h-[64svh] w-auto max-w-full object-contain shadow-[0_14px_34px_-16px_rgba(25,21,16,0.5)]"
                {...(blurDataURL ? { placeholder: "blur" as const, blurDataURL } : {})}
              />
              <span
                aria-hidden
                className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-ink/75 px-3 py-1.5 text-xs font-semibold text-background opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                Tap to enlarge
              </span>
            </button>
          ) : activeView === "custom" && customisable ? (
            <div>
              <TextArtConfigurator
                aspect={aspect}
                defaultText={defaultText}
                defaultFinish={defaultFinishId}
                widthCm={size.widthCm}
                heightCm={size.heightCm}
                onChange={setConfig}
              />
              <div className="mt-6 rounded-xl border border-line bg-surface p-5">
                <p className="text-sm leading-6 text-muted">
                  Happy with it? Send the settings over and we&apos;ll set your
                  words properly by hand, proof it, and come back with the
                  finished artwork before anything is printed.
                </p>
                <LinkButton href={customInquiryHref} className="mt-4">
                  Send this configuration
                </LinkButton>
              </div>
            </div>
          ) : activeView === "ar" && size.ar ? (
            <ArPanel
              glb={size.ar.glb}
              usdz={size.ar.usdz}
              poster={imageSrc}
              alt={imageAlt}
              title={title}
              sizeLabel={size.label}
              widthCm={size.widthCm}
              heightCm={size.heightCm}
              onAnalytics={trackAr}
            />
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
            {activeView === "room" && " Preview updates as you change size."}
          </p>
          {activeView === "artwork" && (
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

          {/* The action belongs here, next to the size chooser. This is the
              point where a visitor has decided what they want, and the only
              inquiry route used to be a card further down the page that did
              not carry the size they had just picked — so they had to say it
              again. Both links carry the chosen size, and the configuration
              too if they have set one. */}
          <div className="mt-6 flex flex-wrap gap-3 border-t border-line pt-6">
            <LinkButton href={customInquiryHref}>{copy.cta.inquireArtwork}</LinkButton>
            <LinkButton
              href={whatsappLink(
                artworkInquiryMessage(
                  title,
                  `${size.label} (${size.widthCm} × ${size.heightCm} cm)`,
                ),
              )}
              external
              variant="outline"
            >
              {copy.cta.whatsapp}
            </LinkButton>
          </div>
        </div>
      </div>

      {/* Fullscreen viewer. Transitions are CSS — see the `zoom-*` classes in
          globals.css — so no animation library is needed on any page. */}
      {zoomed && (
        <div
          ref={zoomRef}
          data-zoom={zoomVisible ? "shown" : "pending"}
          className="zoom-backdrop fixed inset-0 z-50 flex items-center justify-center bg-ink/95 p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={`${title}, full screen`}
          onClick={closeZoom}
        >
            <div
              data-zoom={zoomVisible ? "shown" : "pending"}
              className="zoom-panel relative max-h-full w-full max-w-4xl overflow-hidden rounded-lg"
              style={{ backgroundColor: wallColour(wallTone) }}
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
            </div>
          <button
            ref={closeRef}
            type="button"
            onClick={closeZoom}
            aria-label="Close full screen view"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-background/15 text-2xl leading-none text-background transition-colors hover:bg-background/25 sm:right-8 sm:top-8"
          >
            <span aria-hidden>×</span>
          </button>
        </div>
      )}
    </div>
  );
}
