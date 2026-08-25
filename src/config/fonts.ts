import {
  Amiri,
  Cormorant_Garamond,
  Fraunces,
  Manrope,
  Noto_Nastaliq_Urdu,
} from "next/font/google";

/**
 * Typography: Fraunces — a characterful display serif — paired with Manrope,
 * a clean geometric sans, for UI and body text. Both self-hosted via
 * next/font, so there is no third-party request and no layout shift.
 *
 * Swapping the pairing later only requires edits in this file.
 */
export const displayFont = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  // The optical-size axis is deliberately not requested. It ships a larger
  // variable file for a refinement most readers will never notice, and the
  // display face is the one gating Largest Contentful Paint.
  display: "swap",
});

export const bodyFont = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

/**
 * A third face offered only inside the text-art configurator, for customers
 * setting their own words.
 *
 * `preload: false` matters: without it this is fetched on every page for a
 * feature most visitors never open. Left unpreloaded it is requested only
 * when text is actually rendered in it.
 */
export const scriptFont = Cormorant_Garamond({
  variable: "--font-script",
  subsets: ["latin"],
  weight: ["300", "500"],
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
});

/**
 * Urdu, set in Nastaliq.
 *
 * Urdu is written in Nastaliq and reads wrong to an Urdu reader in anything
 * else, so this is not a stylistic option — it is the only correct face for
 * Urdu wording. The Arabic subset is large, which is exactly why it must never
 * touch the initial load: like the script face it is requested only when the
 * configurator is open and this voice is chosen.
 *
 * Nastaliq also needs far more vertical room than a Latin face. Its metrics are
 * carried in TYPEFACES rather than assumed, because the shared line height
 * clipped descenders that sweep well below the baseline.
 */
export const urduFont = Noto_Nastaliq_Urdu({
  variable: "--font-urdu",
  subsets: ["arabic"],
  weight: ["400", "600"],
  display: "swap",
  preload: false,
});

/**
 * Arabic, set in Naskh.
 *
 * Quranic and classical Arabic wording belongs in Naskh, not Nastaliq — setting
 * an ayat in Nastaliq reads as a category error to anyone who reads Arabic.
 * Amiri is a Naskh face designed for exactly that text.
 */
export const arabicFont = Amiri({
  variable: "--font-arabic",
  subsets: ["arabic"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
});

export const fontVariables = `${displayFont.variable} ${bodyFont.variable} ${scriptFont.variable} ${urduFont.variable} ${arabicFont.variable}`;
