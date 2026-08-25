"use client";

import { useEffect, useRef, useState } from "react";
import type { ArStatus, ModelViewerElement } from "@/types/model-viewer";
import { cn } from "@/lib/utils";

/**
 * Wraps Google's <model-viewer> for one artwork at one size.
 *
 * The library is imported dynamically inside an effect rather than at module
 * scope: it registers a custom element and touches the DOM on import, so it
 * cannot run during server rendering, and it is a large dependency that only
 * matters once someone actually asks to see the piece in 3D.
 *
 * `ios-src` is not optional. model-viewer's own USDZ generator emits
 * horizontal plane anchoring with no way to change it, so wall placement on
 * iPhone is only possible with a pre-built USDZ of our own — which is what the
 * AR pipeline produces.
 *
 * Debugging note: once the custom element upgrades, React assigns `src` as a
 * property and model-viewer does not reflect it back to the attribute. The
 * attribute therefore goes stale in DevTools while the element is loading the
 * correct model — read the property when checking which asset is live.
 */
export function ModelViewerStage({
  glb,
  usdz,
  poster,
  alt,
  label,
  onStatus,
  onReady,
  className,
}: {
  glb: string;
  usdz: string;
  poster: string;
  alt: string;
  /** Human-readable size, surfaced while AR is starting. */
  label: string;
  onStatus?: (status: ArStatus) => void;
  onReady?: (element: ModelViewerElement) => void;
  className?: string;
}) {
  const ref = useRef<ModelViewerElement>(null);
  const [libraryState, setLibraryState] = useState<"loading" | "ready" | "failed">(
    "loading",
  );

  useEffect(() => {
    let cancelled = false;
    import("@google/model-viewer")
      .then(() => {
        if (!cancelled) setLibraryState("ready");
      })
      .catch(() => {
        if (!cancelled) setLibraryState("failed");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element || libraryState !== "ready") return;

    const handleStatus = (event: Event) => {
      const detail = (event as CustomEvent<{ status: ArStatus }>).detail;
      if (detail?.status) onStatus?.(detail.status);
    };
    const handleLoad = () => onReady?.(element);

    element.addEventListener("ar-status", handleStatus);
    element.addEventListener("load", handleLoad);
    if (element.loaded) onReady?.(element);

    return () => {
      element.removeEventListener("ar-status", handleStatus);
      element.removeEventListener("load", handleLoad);
    };
  }, [libraryState, onStatus, onReady]);

  if (libraryState === "failed") {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-xl border border-line bg-surface p-8 text-center text-sm text-muted",
          className,
        )}
      >
        The 3D viewer could not load. The scale preview above still shows this
        piece at {label}.
      </div>
    );
  }

  return (
    <model-viewer
      ref={ref}
      src={glb}
      ios-src={usdz}
      poster={poster}
      alt={alt}
      ar
      // WebXR first so wall placement and fixed scale stay under our control
      // on capable Android browsers, with Scene Viewer as the fallback and
      // Quick Look on iOS.
      ar-modes="webxr scene-viewer quick-look"
      ar-placement="wall"
      ar-scale="fixed"
      camera-controls
      disable-pan
      touch-action="pan-y"
      shadow-intensity="0.9"
      shadow-softness="0.85"
      exposure="1"
      // Near head-on, with the framing distance left to model-viewer so a
      // 160cm piece is not cropped by a radius tuned for a 60cm one. Orbit is
      // clamped to the front: this is a flat object, and swinging behind it
      // just shows an empty back.
      camera-orbit="0deg 85deg auto"
      min-camera-orbit="-40deg 60deg auto"
      max-camera-orbit="40deg 100deg auto"
      interaction-prompt="none"
      className={cn("h-full w-full bg-surface", className)}
      style={{ ["--poster-color" as string]: "transparent" }}
    />
  );
}
