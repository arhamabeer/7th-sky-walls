"use client";

import { getInk, getTypeface } from "@/components/artwork/text-art-options";

/**
 * Draws a configured text piece to a transparent PNG.
 *
 * This exists because the configurator's preview lived only in the DOM, so
 * switching to "On your wall" silently showed the original piece instead of the
 * customer's wording. Showing something different from what was just configured,
 * without saying so, is worse than not offering the view at all.
 *
 * Transparent ground, deliberately. The product is cut lettering on a wall, so
 * painting the configurator's wall colour into the image would put a rectangle
 * of paint on the visitor's real wall in the camera preview — which is exactly
 * what made the preview look like a sheet of paper taped up.
 *
 * The browser measures and shapes the text, which is the point: `measureText`
 * is exact where a per-character estimate is not, and the same approach is what
 * makes Urdu and Arabic possible later — Nastaliq shaping has no working
 * server-side path, and the browser already does it correctly.
 */
export interface CustomArtRequest {
  lines: string[];
  typefaceId: string;
  inkId: string;
  /** width / height of the finished piece. */
  aspect: number;
  /** Long edge of the rendered bitmap. Kept modest: this is a preview. */
  maxEdge?: number;
}

/**
 * next/font exposes its families through CSS custom properties, which a canvas
 * context cannot read. Resolve the variable to the real family list first.
 */
function resolveFontStack(stack: string): string {
  if (typeof document === "undefined") return stack;
  const root = getComputedStyle(document.documentElement);
  return stack.replace(/var\((--[^)]+)\)/g, (_match, name: string) => {
    const value = root.getPropertyValue(name).trim();
    return value || "serif";
  });
}

/** Largest size at which every line fits the box, found by measurement. */
function fitSize(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  fontOf: (size: number) => string,
  maxWidth: number,
  maxHeight: number,
): number {
  const lineRatio = 1.22;
  let low = 4;
  let high = Math.floor(maxHeight);
  let best = low;
  // Binary search rather than stepping: the fit is monotonic in size, and this
  // keeps a five-line verse from costing hundreds of measurements.
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    ctx.font = fontOf(mid);
    const widest = Math.max(...lines.map((line) => ctx.measureText(line).width));
    const totalHeight = lines.length * mid * lineRatio;
    if (widest <= maxWidth && totalHeight <= maxHeight) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return best;
}

export async function renderCustomArt({
  lines,
  typefaceId,
  inkId,
  aspect,
  maxEdge = 1400,
}: CustomArtRequest): Promise<string | null> {
  if (typeof document === "undefined") return null;
  const cleaned = lines.map((l) => l.trim()).filter(Boolean).slice(0, 5);
  if (!cleaned.length) return null;

  const typeface = getTypeface(typefaceId);
  const ink = getInk(inkId);

  const width = aspect >= 1 ? maxEdge : Math.round(maxEdge * aspect);
  const height = aspect >= 1 ? Math.round(maxEdge / aspect) : maxEdge;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Without this the first render can measure and draw in the fallback face,
  // which changes both the metrics and the look.
  await document.fonts.ready.catch(() => {});

  const family = resolveFontStack(typeface.stack);
  const style = typeface.italic ? "italic " : "";
  const fontOf = (size: number) => `${style}${typeface.weight} ${size}px ${family}`;

  const size = fitSize(ctx, cleaned, fontOf, width * 0.88, height * 0.8);
  ctx.font = fontOf(size);
  ctx.fillStyle = ink.value;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const lineHeight = size * 1.22;
  const startY = height / 2 - ((cleaned.length - 1) * lineHeight) / 2;
  cleaned.forEach((line, i) => {
    ctx.fillText(line, width / 2, startY + i * lineHeight);
  });

  return canvas.toDataURL("image/png");
}
