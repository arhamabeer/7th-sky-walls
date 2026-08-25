"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ArStatus, ModelViewerElement } from "@/types/model-viewer";
import { detectArCapability, type ArCapability } from "@/components/ar/ar-capability";
import { cn } from "@/lib/utils";

/**
 * The 3D and AR panel for one artwork at one size.
 *
 * Loaded only on request. Three.js and model-viewer together are far too heavy
 * to sit in the bundle of a page most visitors will read without ever asking
 * to see a piece in 3D.
 */
const ModelViewerStage = dynamic(
  () => import("@/components/ar/model-viewer-stage").then((m) => m.ModelViewerStage),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-muted">
        Loading the 3D view…
      </div>
    ),
  },
);

/**
 * The universal fallback, loaded only when someone opens it. The loading
 * state matters: the chunk is fetched on tap, and without it a slow
 * connection looks like a button that did nothing.
 */
const CameraPreview = dynamic(
  () => import("@/components/ar/camera-preview").then((m) => m.CameraPreview),
  {
    ssr: false,
    loading: () => (
      <div
        role="status"
        className="fixed inset-0 z-50 flex items-center justify-center bg-ink text-sm text-background"
      >
        Opening the camera preview…
      </div>
    ),
  },
);

/** What to tell the visitor before they commit to launching AR. */
const TIER_COPY: Record<
  ArCapability["tier"],
  { action: string; note: string } | null
> = {
  webxr: {
    action: "Place on my wall",
    note: "Point your camera at the wall and move the phone slowly until it locks on.",
  },
  "quick-look": {
    action: "Place on my wall",
    note: "Opens in your phone's AR viewer. Aim at the wall, then tap to place the piece.",
  },
  "scene-viewer": {
    action: "Place on my wall",
    note: "Opens Google's AR viewer. Aim at the wall and move the phone slowly to lock on.",
  },
  overlay: null,
  none: null,
};

export function ArPanel({
  glb,
  usdz,
  poster,
  alt,
  title,
  sizeLabel,
  widthCm,
  heightCm,
  customImage,
  onAnalytics,
}: {
  glb: string;
  usdz: string;
  poster: string;
  /**
   * The customer's own wording, rendered to a transparent PNG.
   *
   * Used for the camera preview, which composites a flat image and can show it.
   * The GLB and USDZ cannot: they are built ahead of time and a customer's words
   * are not known then, so the 3D view and real AR still show the original
   * piece — and the panel says so rather than letting the difference pass
   * unmentioned.
   */
  customImage?: string | null;
  alt: string;
  title: string;
  sizeLabel: string;
  widthCm: number;
  heightCm: number;
  /** Instrumentation hook; AR handoffs are the funnel step most likely to fail silently. */
  onAnalytics?: (event: string, detail?: Record<string, unknown>) => void;
}) {
  const [capability, setCapability] = useState<ArCapability | null>(null);
  const [status, setStatus] = useState<ArStatus | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  /**
   * Set once a launch has demonstrably failed on this device.
   *
   * `navigator.xr.isSessionSupported("immersive-ar")` is a capability claim, not
   * an availability guarantee. Chrome on Android answers true whenever the
   * browser supports AR, without checking that Google Play Services for AR is
   * installed or even installable — so a handset where the Play Store calls
   * that app "incompatible with this device" reports immersive-ar as supported
   * and then fails at requestSession, which is where the visitor meets a
   * "Google Play Services for AR required" screen. Confirmed on a real device
   * reporting immersive-ar: true and immersive-vr: true, both untrue in
   * practice.
   *
   * No web API can tell us this in advance. So the promise of never a dead end
   * is kept by recovering rather than by predicting: after a failure the panel
   * stops leading with AR and leads with the camera preview, which needs no AR
   * runtime at all.
   */
  const [arFailed, setArFailed] = useState(false);
  const viewerRef = useRef<ModelViewerElement | null>(null);
  const launchWatchdog = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Mirrors `status` so the watchdog can read it without a state updater. */
  const statusRef = useRef<ArStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    detectArCapability().then((result) => {
      if (cancelled) return;
      setCapability(result);
      onAnalytics?.("ar_capability_detected", { tier: result.tier, reason: result.reason });
    });
    return () => {
      cancelled = true;
    };
  }, [onAnalytics]);

  const handleReady = useCallback((element: ModelViewerElement) => {
    viewerRef.current = element;
  }, []);

  const handleStatus = useCallback(
    (next: ArStatus) => {
      statusRef.current = next;
      setStatus(next);
      onAnalytics?.("ar_status", { status: next, title, size: sizeLabel });
      if (next === "session-started" && launchWatchdog.current) {
        clearTimeout(launchWatchdog.current);
        launchWatchdog.current = null;
      }
      if (next === "failed") {
        setArFailed(true);
        setLaunchError(
          "This device could not start AR — usually because Google Play Services for AR is not available for it. The camera preview below works without it, and shows the piece at its true size.",
        );
      }
    },
    [onAnalytics, title, sizeLabel],
  );

  const launch = useCallback(async () => {
    const element = viewerRef.current;
    onAnalytics?.("ar_launch_attempt", { title, size: sizeLabel });

    if (!element) {
      setLaunchError("The 3D view is still loading. Try again in a moment.");
      return;
    }
    // canActivateAR is false when no AR path is actually available, which is
    // the difference between a button that works and one that does nothing.
    if (!element.canActivateAR) {
      setLaunchError(
        "AR is not available in this browser. On a phone, open this page in Safari or Chrome to place the piece on your wall.",
      );
      onAnalytics?.("ar_launch_unavailable", { title, size: sizeLabel });
      return;
    }
    setLaunchError(null);

    /**
     * Watch for a WebXR session that never starts.
     *
     * Not every failure arrives as an event: Chrome can take the visitor to a
     * Play Services install screen and return them with no ar-status at all, so
     * waiting for one would leave the panel looking like nothing happened. A
     * session that has not started after five seconds has not started.
     *
     * Only for in-page AR. On the handoff tiers the page is backgrounded while
     * the platform viewer is open, so a timer there would report failure for a
     * launch that worked.
     */
    if (!capability?.handsOff) {
      if (launchWatchdog.current) clearTimeout(launchWatchdog.current);
      launchWatchdog.current = setTimeout(() => {
        launchWatchdog.current = null;
        const current = statusRef.current;
        if (current === "session-started" || current === "object-placed") return;
        setArFailed(true);
        setLaunchError(
          "AR did not start on this device — usually because Google Play Services for AR is not available for it. The camera preview below works without it, and shows the piece at its true size.",
        );
        onAnalytics?.("ar_launch_timeout", { title, size: sizeLabel });
      }, 5000);
    }

    try {
      await element.activateAR();
    } catch {
      if (launchWatchdog.current) {
        clearTimeout(launchWatchdog.current);
        launchWatchdog.current = null;
      }
      setArFailed(true);
      setLaunchError(
        "AR could not start on this device — usually because Google Play Services for AR is not available for it. The camera preview below works without it.",
      );
      onAnalytics?.("ar_launch_error", { title, size: sizeLabel });
    }
  }, [onAnalytics, title, sizeLabel, capability?.handsOff]);

  useEffect(
    () => () => {
      if (launchWatchdog.current) clearTimeout(launchWatchdog.current);
    },
    [],
  );

  /**
   * A launch that failed demotes AR for the rest of the visit. The overlay
   * branch below then becomes the primary path, and AR stays available as a
   * clearly secondary retry — leading with something that has already failed
   * once on this device is the dead end this panel exists to avoid.
   */
  const copy = capability && !arFailed ? TIER_COPY[capability.tier] : null;
  const showOverlayFirst = Boolean(capability) && (arFailed || capability?.tier === "overlay");

  return (
    <div className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      <div className="aspect-[4/3] overflow-hidden rounded-lg bg-background">
        <ModelViewerStage
          glb={glb}
          usdz={usdz}
          poster={poster}
          alt={`${alt} — three-dimensional view`}
          label={`${widthCm} × ${heightCm} cm`}
          onReady={handleReady}
          onStatus={handleStatus}
        />
      </div>

      <p className="mt-3 text-sm text-muted">
        {title} at {sizeLabel} — {widthCm} × {heightCm} cm. Drag to turn the piece.
      </p>

      {/* Never let a customised piece quietly become the original. The 3D model
          is built ahead of time, so it cannot carry the customer's words — say
          that plainly, and point at the view that can. */}
      {customImage && (
        <p className="mt-2 rounded-lg border border-accent/40 bg-surface p-3 text-xs leading-5">
          The 3D view and AR above show the original piece — your wording is set
          by hand before printing, so it is not in the 3D model. The camera
          preview below does show your words, and your settings travel with the
          inquiry either way.
        </p>
      )}

      {capability === null ? (
        <p className="mt-3 text-sm text-muted">Checking what your device supports…</p>
      ) : copy ? (
        <>
          <button
            type="button"
            onClick={launch}
            className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-ink px-6 text-sm font-semibold text-background transition-opacity hover:opacity-85 sm:w-auto"
          >
            {copy.action}
          </button>
          <p className="mt-2 text-xs leading-5 text-muted">{copy.note}</p>
          <p className="mt-1 text-xs leading-5 text-muted">
            The piece appears at its true size — {widthCm} × {heightCm} cm — and
            cannot be resized, so what you see is what arrives.
          </p>
        </>
      ) : showOverlayFirst ? (
        <>
          <button
            type="button"
            onClick={() => setCameraOpen(true)}
            className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-ink px-6 text-sm font-semibold text-background transition-opacity hover:opacity-85 sm:w-auto"
          >
            Preview with your camera
          </button>
          <p className="mt-2 text-xs leading-5 text-muted">
            {arFailed
              ? "The piece will not stay pinned to the wall here — but you can still hold it up against the room, and calibrate against a sheet of paper to see its true size."
              : "This device has no AR runtime, so the piece will not stay pinned to the wall — but you can still hold it up against the room, and calibrate against a sheet of paper to see its true size."}
          </p>
          {/* Scene Viewer stays reachable on Android, but as a secondary and
              honestly labelled: it is expected to fail here, and the reason is
              stated so a tap that goes nowhere is not a surprise. Making it the
              primary action is what left this device with a dead button. */}
          {arFailed && (
            <p className="mt-3 text-xs leading-5 text-muted">
              <button
                type="button"
                onClick={launch}
                className="inline-flex min-h-11 items-center font-semibold text-accent underline underline-offset-4"
              >
                Try AR again
              </button>{" "}
              — worth one retry if you have since installed Google Play Services
              for AR.
            </p>
          )}
          {!arFailed && capability.sceneViewerFallback && (
            <p className="mt-3 text-xs leading-5 text-muted">
              <button
                type="button"
                onClick={launch}
                className="inline-flex min-h-11 items-center font-semibold text-accent underline underline-offset-4"
              >
                Try Google&apos;s AR viewer anyway
              </button>{" "}
              — it needs Google Play Services for AR, which this device reports
              as unavailable.
            </p>
          )}
        </>
      ) : (
        <p className="mt-3 text-sm leading-6 text-muted">
          AR needs a phone or tablet with a camera. Open this page on your phone
          to place the piece on your own wall — the scale preview above answers
          the size question either way.
        </p>
      )}

      {status === "session-started" && (
        <p className="mt-2 text-xs text-accent">Starting AR…</p>
      )}
      {launchError && (
        <p
          role="status"
          className={cn(
            "mt-3 rounded-lg border border-accent/40 bg-accent/10 p-3 text-sm leading-6",
          )}
        >
          {launchError}
        </p>
      )}

      {/* Offered from the same UI whichever tier the device landed on, so a
          failed handoff always has somewhere to go. Suppressed once the camera
          preview has become the primary action, where it would only repeat the
          button directly above it. */}
      {!showOverlayFirst && (capability?.handsOff || launchError) && (
        <p className="mt-3 text-xs leading-5 text-muted">
          <button
            type="button"
            onClick={() => setCameraOpen(true)}
            className="inline-flex min-h-11 items-center font-semibold text-accent underline underline-offset-4"
          >
            {capability?.tier === "overlay"
              ? "How the camera preview works"
              : "Or preview it with your camera instead"}
          </button>
        </p>
      )}

      {cameraOpen && (
        <CameraPreview
          imageSrc={customImage ?? poster}
          imageAlt={alt}
          title={title}
          widthCm={widthCm}
          heightCm={heightCm}
          onClose={() => setCameraOpen(false)}
          onAnalytics={onAnalytics}
        />
      )}
    </div>
  );
}
