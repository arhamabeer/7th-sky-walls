"use client";

import { useEffect } from "react";
import "./globals.css";
import { site } from "@/config/site.config";
import { brandVars } from "@/config/brand-vars";
import { fontVariables } from "@/config/fonts";
import { copy } from "@/content/copy";
import { reportError } from "@/lib/report-error";

/**
 * Last-resort error boundary, for a failure in the root layout itself.
 *
 * This replaces the layout rather than rendering inside it, so it owns its own
 * `<html>` and `<body>` and has to set the brand variables and fonts itself.
 * Header, footer and navigation are deliberately absent: whatever broke may be
 * in one of them, so this page depends on nothing but the stylesheet and links
 * out by plain anchor rather than the router.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root layout error", error.digest ?? "", error);
    reportError("root-layout", error);
  }, [error]);

  return (
    <html lang={site.locale} className={`${fontVariables} h-full antialiased`} style={brandVars}>
      <body className="flex min-h-full flex-col bg-background text-ink">
        <main className="flex flex-1 items-center px-6 py-20">
          <div className="mx-auto w-full max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              {copy.error.eyebrow}
            </p>
            <h1 className="mt-3 font-display text-4xl font-medium leading-[1.06] tracking-tight sm:text-5xl">
              {copy.error.title}
            </h1>
            <p className="mt-4 text-base leading-8 text-muted">{copy.error.body}</p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={reset}
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-ink px-6 py-3 text-sm font-semibold text-background transition-all hover:opacity-85"
              >
                {copy.error.retry}
              </button>
              {/* A plain anchor, not next/link: the root layout is what failed,
                  so a client-side transition would re-mount the same broken
                  tree. This forces a full document load. */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a
                href="/"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-ink/25 px-6 py-3 text-sm font-semibold text-ink transition-all hover:border-ink"
              >
                {copy.nav.home}
              </a>
            </div>

            <p className="mt-10 text-sm text-muted">
              <a
                href={`mailto:${site.contact.email}`}
                className="font-semibold text-accent underline-offset-4 hover:underline"
              >
                {site.contact.email}
              </a>
            </p>
          </div>
        </main>
      </body>
    </html>
  );
}
