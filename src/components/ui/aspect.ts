/**
 * Tailwind aspect-ratio class per artwork orientation. Kept in one place so
 * card, stage and room previews can never disagree about an artwork's shape —
 * a mismatch would crop the piece and misrepresent what gets printed.
 *
 * Ratios mirror ORIENTATION_ASPECT in content/catalog.ts.
 */
export const ORIENTATION_ASPECT_CLASS: Record<string, string> = {
  portrait: "aspect-[3/4]",
  landscape: "aspect-[4/3]",
  square: "aspect-square",
  panorama: "aspect-[5/2]",
};

export function aspectClass(orientation: string): string {
  return ORIENTATION_ASPECT_CLASS[orientation] ?? ORIENTATION_ASPECT_CLASS.portrait;
}
