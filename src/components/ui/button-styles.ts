import { cn } from "@/lib/utils";

/**
 * One recipe for every button-shaped control, whether it navigates
 * (`LinkButton`) or acts (`Button`). Kept out of both components so neither
 * owns the look and the two cannot drift apart.
 */
export const BUTTON_VARIANTS = {
  /** Dark solid — the default call to action on light surfaces. */
  primary: "bg-ink text-background hover:opacity-85",
  /** Bordered, for secondary actions on light surfaces. */
  outline: "border border-ink/25 text-ink hover:border-ink",
  /** Light solid, for use on dark surfaces. */
  inverted: "bg-background text-ink hover:opacity-90",
  /** Bordered light, for secondary actions on dark surfaces or imagery. */
  outlineInverted:
    "border border-background/45 text-background hover:border-background hover:bg-background/10",
} as const;

export type ButtonVariant = keyof typeof BUTTON_VARIANTS;

/** `min-h-12` keeps every control past the 44px touch-target floor. */
export function buttonClass(variant: ButtonVariant = "primary", className?: string): string {
  return cn(
    "inline-flex min-h-12 items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition-all",
    BUTTON_VARIANTS[variant],
    className,
  );
}
