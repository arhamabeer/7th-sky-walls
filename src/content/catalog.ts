import type { Orientation, SizeId, SizeTier } from "@/lib/content/schema";

/**
 * Size model.
 *
 * Sizes are defined by a long edge per tier, and the short edge is derived
 * from the artwork's orientation aspect. This keeps every size of a given
 * artwork on the SAME aspect ratio, which matters for two reasons:
 *
 *  1. A print cannot change proportion between sizes without cropping the
 *     artwork, so a mixed-ratio chart would silently misrepresent the piece.
 *  2. The AR models generated per artwork must match the printed proportions
 *     exactly, or true-to-scale placement on a wall is wrong.
 *
 * Panoramic pieces get their own tier scale because a 60cm long edge would be
 * a 24cm-tall sliver.
 */

/** width / height for each orientation. */
export const ORIENTATION_ASPECT: Record<Orientation, number> = {
  portrait: 3 / 4,
  landscape: 4 / 3,
  square: 1,
  panorama: 5 / 2,
};

export const SIZE_TIERS: SizeTier[] = [
  { id: "s", label: "Small", longEdgeCm: 60, panoramaLongEdgeCm: 120 },
  { id: "m", label: "Medium", longEdgeCm: 80, panoramaLongEdgeCm: 150 },
  { id: "l", label: "Large", longEdgeCm: 120, panoramaLongEdgeCm: 200 },
  { id: "xl", label: "Extra large", longEdgeCm: 160, panoramaLongEdgeCm: 250 },
];

/** Resolved centimetre dimensions for a tier in a given orientation. */
export function resolveSize(
  sizeId: SizeId,
  orientation: Orientation,
): { label: string; widthCm: number; heightCm: number } {
  const tier = SIZE_TIERS.find((t) => t.id === sizeId);
  if (!tier) throw new Error(`Unknown size tier "${sizeId}"`);

  const longEdge =
    orientation === "panorama" ? tier.panoramaLongEdgeCm : tier.longEdgeCm;
  const aspect = ORIENTATION_ASPECT[orientation];

  // Portrait is the only orientation whose long edge is the height.
  const widthCm = orientation === "portrait" ? Math.round(longEdge * aspect) : longEdge;
  const heightCm = orientation === "portrait" ? longEdge : Math.round(longEdge / aspect);

  return { label: tier.label, widthCm, heightCm };
}

