"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusTrap } from "@/components/ui/use-focus-trap";
import { cn } from "@/lib/utils";

/**
 * Camera overlay preview — the universal fallback.
 *
 * Where no AR runtime exists, this composites the artwork over the live camera
 * feed so someone can still judge how a piece sits on their wall. It makes no
 * claim to be AR: there is no plane tracking, so the piece does not stay put
 * when the phone moves.
 *
 * What it does offer is honest scale. Holding a sheet of A4 or Letter paper
 * against the wall and matching the on-screen guide to it establishes
 * pixels-per-centimetre, after which the artwork is drawn at its true size
 * rather than at a guess. Until that happens the size is labelled approximate,
 * because claiming true scale without a reference would be a lie the customer
 * only discovers on delivery.
 *
 * Platform constraints handled here, all of them iOS Safari realities:
 *  - getUserMedia needs a secure context, so the state is checked up front
 *    rather than failing at the permission prompt.
 *  - The video element needs autoplay, muted and playsinline or iOS forces it
 *    fullscreen; play() is called inside the tap handler so Low Power Mode
 *    does not block it.
 *  - The stream is interrupted when the tab is backgrounded, so it is
 *    re-acquired on visibilitychange.
 */

/** Reference sheets, in centimetres. */
const SHEETS = [
  { id: "a4", name: "A4 paper", widthCm: 21, heightCm: 29.7 },
  { id: "letter", name: "US Letter", widthCm: 21.6, heightCm: 27.9 },
] as const;

type Phase = "idle" | "requesting" | "live" | "frozen" | "denied" | "unsupported";

interface Placement {
  /** Centre of the artwork, in percent of the viewport box. */
  x: number;
  y: number;
  /** Multiplier applied when no calibration exists. */
  scale: number;
}

export function CameraPreview({
  imageSrc,
  imageAlt,
  title,
  widthCm,
  heightCm,
  onClose,
  onAnalytics,
}: {
  imageSrc: string;
  imageAlt: string;
  title: string;
  widthCm: number;
  heightCm: number;
  onClose: () => void;
  onAnalytics?: (event: string, detail?: Record<string, unknown>) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // The overlay covers the page and claims aria-modal, so Tab has to stay in it.
  useFocusTrap(rootRef, true);

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [placement, setPlacement] = useState<Placement>({ x: 50, y: 42, scale: 1 });
  const [pxPerCm, setPxPerCm] = useState<number | null>(null);
  const [calibrating, setCalibrating] = useState(false);
  const [sheetId, setSheetId] = useState<(typeof SHEETS)[number]["id"]>("a4");
  const [sheetWidthPx, setSheetWidthPx] = useState(160);

  const sheet = SHEETS.find((s) => s.id === sheetId) ?? SHEETS[0];

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setPhase("unsupported");
      return;
    }
    if (!window.isSecureContext) {
      setPhase("unsupported");
      setError(
        "The camera is only available over a secure connection. Open the live site rather than a local preview.",
      );
      return;
    }

    setPhase("requesting");
    onAnalytics?.("camera_preview_request", { title });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        // Called inside the tap handler's async continuation so Low Power
        // Mode does not refuse the play.
        await video.play().catch(() => {});
      }
      setPhase("live");
      onAnalytics?.("camera_preview_started", { title });
    } catch (err) {
      const name = (err as DOMException)?.name;
      setPhase("denied");
      setError(
        name === "NotAllowedError"
          ? "Camera access was declined. You can allow it in your browser's site settings and try again."
          : "We could not open the camera on this device.",
      );
      onAnalytics?.("camera_preview_failed", { title, reason: name ?? "unknown" });
    }
  }, [onAnalytics, title]);

  // Re-acquire the stream when returning to the tab; iOS interrupts it.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      if (phase !== "live") return;
      const track = streamRef.current?.getVideoTracks()[0];
      if (!track || track.readyState === "ended") void start();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [phase, start]);

  useEffect(() => () => stopStream(), [stopStream]);

  // Escape closes; the page must not scroll behind a fullscreen camera.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = previous;
    };
  }, [onClose]);

  /** Freeze the current frame, which makes positioning far easier by hand. */
  const freeze = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    setPhase("frozen");
    onAnalytics?.("camera_preview_frozen", { title });
  };

  const unfreeze = () => setPhase("live");

  const applyCalibration = () => {
    const stage = stageRef.current;
    if (!stage) return;
    setPxPerCm(sheetWidthPx / sheet.widthCm);
    setCalibrating(false);
    onAnalytics?.("camera_preview_calibrated", { title, sheet: sheet.id });
  };

  // Drag the artwork with a pointer, which covers touch and mouse alike.
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const stage = stageRef.current;
    if (!stage) return;
    (event.target as Element).setPointerCapture?.(event.pointerId);
    const rect = stage.getBoundingClientRect();

    const move = (e: PointerEvent) => {
      setPlacement((p) => ({
        ...p,
        x: Math.min(95, Math.max(5, ((e.clientX - rect.left) / rect.width) * 100)),
        y: Math.min(95, Math.max(5, ((e.clientY - rect.top) / rect.height) * 100)),
      }));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const artworkWidthPx = pxPerCm ? widthCm * pxPerCm : null;
  const artworkStyle = artworkWidthPx
    ? { width: `${artworkWidthPx}px`, height: `${heightCm * (pxPerCm as number)}px` }
    : { width: `${44 * placement.scale}%`, aspectRatio: `${widthCm} / ${heightCm}` };

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-50 flex flex-col bg-ink text-background"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${title} on your wall using the camera`}
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <p className="text-sm font-semibold">{title}</p>
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 min-w-11 items-center justify-center rounded-full bg-background/15 px-4 text-sm font-semibold"
        >
          Close
        </button>
      </div>

      <div ref={stageRef} className="relative flex-1 overflow-hidden bg-black">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={cn(
            "h-full w-full object-cover",
            phase === "live" ? "opacity-100" : "opacity-0",
          )}
        />
        <canvas
          ref={canvasRef}
          className={cn(
            "absolute inset-0 h-full w-full object-cover",
            phase === "frozen" ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        />

        {(phase === "live" || phase === "frozen") && (
          <>
            {/* The artwork */}
            <div
              onPointerDown={onPointerDown}
              role="button"
              tabIndex={0}
              aria-label="Drag to position the artwork"
              className="absolute cursor-move touch-none shadow-[0_18px_44px_-16px_rgba(0,0,0,0.8)] ring-1 ring-white/20"
              style={{
                left: `${placement.x}%`,
                top: `${placement.y}%`,
                transform: "translate(-50%, -50%)",
                ...artworkStyle,
              }}
            >
              <Image
                src={imageSrc}
                alt={imageAlt}
                fill
                sizes="80vw"
                className="pointer-events-none object-contain"
              />
            </div>

            {/* Calibration guide */}
            {calibrating && (
              <div
                aria-hidden
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border-2 border-dashed border-accent-soft"
                style={{
                  width: `${sheetWidthPx}px`,
                  height: `${sheetWidthPx * (sheet.heightCm / sheet.widthCm)}px`,
                }}
              />
            )}
          </>
        )}

        {phase === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <p className="max-w-sm text-sm leading-6 text-background/80">
              This uses your camera to place {title} over your wall. It is a
              preview rather than true AR — the piece will not stay pinned when
              you move the phone.
            </p>
            <button
              type="button"
              onClick={start}
              className="inline-flex min-h-12 items-center rounded-full bg-background px-6 text-sm font-semibold text-ink"
            >
              Start the camera
            </button>
          </div>
        )}

        {phase === "requesting" && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-background/80">
            Waiting for camera permission…
          </p>
        )}

        {(phase === "denied" || phase === "unsupported") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <p className="max-w-sm text-sm leading-6 text-background/85">{error}</p>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-12 items-center rounded-full bg-background px-6 text-sm font-semibold text-ink"
            >
              Back to the artwork
            </button>
          </div>
        )}
      </div>

      {(phase === "live" || phase === "frozen") && (
        <div className="space-y-3 px-4 pb-5 pt-3">
          <p aria-live="polite" className="text-xs leading-5 text-background/75">
            {pxPerCm
              ? `Shown at ${widthCm} × ${heightCm} cm — calibrated against ${sheet.name}.`
              : `Approximate size. Calibrate with a sheet of paper to see ${widthCm} × ${heightCm} cm accurately.`}
          </p>

          {calibrating ? (
            <div className="space-y-3 rounded-xl bg-background/10 p-3">
              <p className="text-xs leading-5 text-background/85">
                Hold a sheet of {sheet.name} flat against the wall, then stretch
                the dashed guide until it matches the sheet exactly.
              </p>
              <div className="flex flex-wrap gap-2">
                {SHEETS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setSheetId(option.id)}
                    aria-pressed={option.id === sheetId}
                    className={cn(
                      "inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium",
                      option.id === sheetId
                        ? "bg-background text-ink"
                        : "bg-background/15 text-background",
                    )}
                  >
                    {option.name}
                  </button>
                ))}
              </div>
              <label className="block text-xs text-background/85">
                Guide width
                <input
                  type="range"
                  min={60}
                  max={400}
                  value={sheetWidthPx}
                  onChange={(e) => setSheetWidthPx(Number(e.target.value))}
                  className="mt-1 block w-full"
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={applyCalibration}
                  className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-background text-sm font-semibold text-ink"
                >
                  It matches
                </button>
                <button
                  type="button"
                  onClick={() => setCalibrating(false)}
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-background/15 px-4 text-sm font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCalibrating(true)}
                className="inline-flex min-h-11 items-center rounded-full bg-background/15 px-4 text-sm font-semibold"
              >
                {pxPerCm ? "Recalibrate" : "Calibrate for true size"}
              </button>
              <button
                type="button"
                onClick={phase === "frozen" ? unfreeze : freeze}
                className="inline-flex min-h-11 items-center rounded-full bg-background/15 px-4 text-sm font-semibold"
              >
                {phase === "frozen" ? "Resume camera" : "Freeze the frame"}
              </button>
              {!pxPerCm && (
                <div className="flex items-center gap-2 rounded-full bg-background/15 px-3">
                  <label htmlFor="preview-scale" className="text-xs">
                    Size
                  </label>
                  <input
                    id="preview-scale"
                    type="range"
                    min={0.4}
                    max={2}
                    step={0.02}
                    value={placement.scale}
                    onChange={(e) =>
                      setPlacement((p) => ({ ...p, scale: Number(e.target.value) }))
                    }
                    className="h-11 w-32"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
