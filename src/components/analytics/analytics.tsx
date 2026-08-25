import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GoogleAnalytics } from "@next/third-parties/google";

/**
 * Analytics, in two layers with different jobs.
 *
 * Vercel Analytics and Speed Insights are cookieless and report field Core Web
 * Vitals — the numbers that actually matter for a visually heavy site, and the
 * ones a lab score cannot tell you. They need no consent banner.
 *
 * Both are mounted only on Vercel. Their scripts are served by the Vercel edge
 * at /_vercel/insights and /_vercel/speed-insights, which exist nowhere else —
 * so loading them locally or on any other host produces a 404 on every page
 * view and nothing useful.
 *
 * Google Analytics carries the marketing view and loads only when a
 * measurement id is configured, keeping development and preview deployments
 * out of the reporting property.
 */
export function SiteAnalytics() {
  const onVercel = Boolean(process.env.VERCEL);
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <>
      {onVercel ? (
        <>
          <Analytics />
          <SpeedInsights />
        </>
      ) : null}
      {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
    </>
  );
}
