import { twMerge } from "tailwind-merge";

/**
 * Join class names with conflict resolution: when two classes target the same
 * CSS property (e.g. `text-ink` from a variant and `text-background` from a
 * caller override), the LAST one wins. A plain string join would leave both in
 * the class list and let Tailwind's stylesheet order decide the winner, which
 * silently produces invisible text on overridden variants.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return twMerge(classes.filter(Boolean).join(" "));
}
