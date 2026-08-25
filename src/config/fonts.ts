import { Cormorant_Garamond, Fraunces, Manrope } from "next/font/google";

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

export const fontVariables = `${displayFont.variable} ${bodyFont.variable} ${scriptFont.variable}`;
