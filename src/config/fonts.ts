import { Cormorant_Garamond, Fraunces, Manrope } from "next/font/google";

/**
 * Typography proposal (Phase 1): Fraunces — a characterful display serif
 * with optical sizing, for headlines and the wordmark — paired with
 * Manrope, a clean geometric sans, for UI and body text. Both self-hosted
 * via next/font (zero CLS, no external requests at runtime).
 *
 * Swapping the pairing later only requires edits in this file.
 */
export const displayFont = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
});

export const bodyFont = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

/**
 * A third face offered only inside the text-art configurator, for customers
 * setting their own words. Lighter and more classical than the display face,
 * which suits verse and quotations.
 */
export const scriptFont = Cormorant_Garamond({
  variable: "--font-script",
  subsets: ["latin"],
  weight: ["300", "500"],
  style: ["normal", "italic"],
  display: "swap",
});

export const fontVariables = `${displayFont.variable} ${bodyFont.variable} ${scriptFont.variable}`;
