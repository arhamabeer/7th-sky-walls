import { Fraunces, Manrope } from "next/font/google";

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

export const fontVariables = `${displayFont.variable} ${bodyFont.variable}`;
