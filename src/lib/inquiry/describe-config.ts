import { getMount } from "@/content/finishes";
import {
  getGround,
  getInk,
  getTypeface,
} from "@/components/artwork/text-art-options";
import { getSizeDimensions } from "@/lib/content";
import type { Orientation, SizeId } from "@/lib/content/schema";
import { MAX_CONFIG_TEXT } from "@/lib/inquiry/config-link";

/**
 * Turns configurator query parameters into a sentence the studio can act on.
 *
 * The customer arrives at the form having already made choices; repeating those
 * back in plain language does two things — it lets them confirm the settings
 * survived the trip, and it means the studio's inbox contains a brief rather than
 * a query string.
 *
 * Which is exactly why an unrecognised value has to be dropped rather than
 * resolved. The option getters all fall back to their first entry, so
 * `?typeface=nonsense&ink=nonsense` used to produce "Set in monumental lettering,
 * ink ink" — a brief asserting choices the visitor never made, prefilled into
 * their own message and sent on to be quoted from. A fallback is the right
 * behaviour for rendering a preview and the wrong behaviour for writing down what
 * somebody asked for.
 */
export function describeConfig(
  params: Record<string, string | string[] | undefined>,
  artwork: { title: string; orientation: Orientation; sizes: readonly string[] },
): string | null {
  const get = (key: string) =>
    typeof params[key] === "string" ? (params[key] as string) : undefined;

  /** The option's name, or null when the id is not one we publish. */
  const named = (id: string | undefined, lookup: (id: string) => { id: string; name: string }) => {
    if (!id) return null;
    const option = lookup(id);
    return option.id === id ? option.name.toLowerCase() : null;
  };

  const parts: string[] = [];

  const sizeId = get("size");
  if (sizeId && artwork.sizes.includes(sizeId)) {
    const d = getSizeDimensions(sizeId as SizeId, artwork.orientation);
    parts.push(`${d.label} (${d.widthCm} × ${d.heightCm} cm)`);
  }

  const mount = named(get("finish"), getMount);
  if (mount) parts.push(mount);

  const text = get("text")?.trim().slice(0, MAX_CONFIG_TEXT);

  const typeface = named(get("typeface"), getTypeface);
  const ink = named(get("ink"), getInk);
  const ground = named(get("ground"), getGround);

  const typeSettings: string[] = [];
  if (typeface) typeSettings.push(`${typeface} lettering`);
  // The default ink is named "Ink", so the obvious `${name} ink` wrote "ink ink"
  // into the most common brief of all.
  if (ink) typeSettings.push(ink.endsWith("ink") ? ink : `${ink} ink`);
  if (ground) typeSettings.push(`${ground} ground`);

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
