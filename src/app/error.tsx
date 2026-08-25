"use client";

import { useEffect } from "react";
import Link from "next/link";
import { copy } from "@/content/copy";
import { whatsappLink } from "@/config/site.config";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";

/**
 * Route-level error boundary.
 *
 * Without this, a runtime error inside a client island — the AR panel, the
 * configurator, the planner — replaces the page with Next's own screen, which
 * in production reads "Application error: a client-side exception has
 * occurred". On a site whose signature feature is client-side, that is the
 * wrong failure mode: it loses the brand and every route onward.
 *
 * `reset()` re-renders the segment, which is enough for a transient failure
 * (a chunk that did not arrive, a camera handle that was refused).
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Reaches the browser console in development and whatever error reporter is
    // wired up in production. The digest is what correlates it to the server log.
    console.error("Route error", error.digest ?? "", error);
  }, [error]);

  return (
    <section className="py-16 sm:py-24">
      <Container>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          {copy.error.eyebrow}
        </p>
        <h1 className="mt-3 max-w-2xl font-display text-4xl font-medium leading-[1.06] tracking-tight sm:text-5xl">
          {copy.error.title}
        </h1>
        <p className="mt-4 max-w-xl text-base leading-8 text-muted">{copy.error.body}</p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button onClick={reset}>{copy.error.retry}</Button>
          <LinkButton href="/portfolio" variant="outline">
            {copy.cta.explore}
          </LinkButton>
        </div>

        <p className="mt-10 text-sm text-muted">
          <Link
            href="/contact"
            className="font-semibold text-accent underline-offset-4 hover:underline"
          >
            {copy.cta.primary}
          </Link>
          {" · "}
          <a
            href={whatsappLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-accent underline-offset-4 hover:underline"
          >
            {copy.cta.whatsapp}
          </a>
        </p>
      </Container>
    </section>
  );
}
