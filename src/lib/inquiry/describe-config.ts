import { getFinish } from "@/content/finishes";
import {
  getGround,
  getInk,
  getTypeface,
} from "@/components/artwork/text-art-options";
import { getSizeDimensions } from "@/lib/content";
import type { Orientation, SizeId } from "@/lib/content/schema";

/**
 * Turns configurator query parameters into a sentence the studio can act on.
 *
 * The customer arrives at the form having already made choices; repeating
 * those back in plain language does two things — it lets them confirm the
 * settings survived the trip, and it means the studio's inbox contains a
 * brief rather than a query string.
 */
export function describeConfig(
  params: Record<string, string | string[] | undefined>,
  artwork: { title: string; orientation: Orientation; sizes: readonly string[] },
): string | null {
  const get = (key: string) =>
    typeof params[key] === "string" ? (params[key] as string) : undefined;

  const parts: string[] = [];

  const sizeId = get("size");
  if (sizeId && artwork.sizes.includes(sizeId)) {
    const d = getSizeDimensions(sizeId as SizeId, artwork.orientation);
    parts.push(`${d.label} (${d.widthCm} × ${d.heightCm} cm)`);
  }

  const finishId = get("finish");
  if (finishId) parts.push(`${getFinish(finishId).name.toLowerCase()} frame`);

  const text = get("text")?.trim();
  const typefaceId = get("typeface");
  const inkId = get("ink");
  const groundId = get("ground");

  const typeSettings: string[] = [];
  if (typefaceId) typeSettings.push(`${getTypeface(typefaceId).name.toLowerCase()} lettering`);
  if (inkId) typeSettings.push(`${getInk(inkId).name.toLowerCase()} ink`);
  if (groundId) typeSettings.push(`${getGround(groundId).name.toLowerCase()} ground`);

  if (!parts.length && !typeSettings.length && !text) return null;

  const lines: string[] = [];
  lines.push(`I've configured ${artwork.title}${parts.length ? `: ${parts.join(", ")}` : ""}.`);
  if (typeSettings.length) lines.push(`Set in ${typeSettings.join(", ")}.`);
  if (text) {
    const wording = text.includes("\n")
      ? `\n\nThe wording, line by line:\n${text}`
      : `\n\nThe wording: "${text}"`;
    lines.push(wording);
  }

  return lines.join(" ").replace(/\s+\n/g, "\n");
}
