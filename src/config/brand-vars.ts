import type { CSSProperties } from "react";
import { site } from "@/config/site.config";

/**
 * The brand palette from site.config, exposed to CSS as custom properties on
 * the root element. Shared because `global-error` replaces the root layout and
 * has to set these itself — otherwise the one page that appears when
 * everything else has failed is the one page with no brand on it.
 */
export const brandVars = {
  "--brand-background": site.colors.background,
  "--brand-surface": site.colors.surface,
  "--brand-ink": site.colors.ink,
  "--brand-muted": site.colors.muted,
  "--brand-line": site.colors.line,
  "--brand-accent": site.colors.accent,
  "--brand-accent-soft": site.colors.accentSoft,
  "--brand-sky": site.colors.sky,
} as CSSProperties;
