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
  onAnalytics,
}: {
  glb: string;
  usdz: string;
  poster: string;
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
  const viewerRef = useRef<ModelViewerElement | null>(null);

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
      setStatus(next);
      onAnalytics?.("ar_status", { status: next, title, size: sizeLabel });
      if (next === "failed") {
        setLaunchError(
          "Your device could not start AR. The scale preview above still shows this piece at true size.",
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
    try {
      await element.activateAR();
    } catch {
      setLaunchError("AR could not start. Please try again.");
      onAnalytics?.("ar_launch_error", { title, size: sizeLabel });
    }
  }, [onAnalytics, title, sizeLabel]);

  const copy = capability ? TIER_COPY[capability.tier] : null;

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
      ) : capability.tier === "overlay" ? (
        <>
          <button
            type="button"
            onClick={() => setCameraOpen(true)}
            className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-ink px-6 text-sm font-semibold text-background transition-opacity hover:opacity-85 sm:w-auto"
          >
            Preview with your camera
          </button>
          <p className="mt-2 text-xs leading-5 text-muted">
            This device has no AR runtime, so the piece will not stay pinned to
            the wall — but you can still hold it up against the room, and
            calibrate against a sheet of paper to see its true size.
          </p>
          {/* Scene Viewer stays reachable on Android, but as a secondary and
              honestly labelled: it is expected to fail here, and the reason is
              stated so a tap that goes nowhere is not a surprise. Making it the
              primary action is what left this device with a dead button. */}
          {capability.sceneViewerFallback && (
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
          failed handoff always has somewhere to go. */}
      {(capability?.handsOff || capability?.tier === "overlay" || launchError) && (
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
          imageSrc={poster}
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
