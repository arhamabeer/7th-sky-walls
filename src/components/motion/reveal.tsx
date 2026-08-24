"use client";

import { useEffect, useRef, useState } from "react";
import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Viewport-triggered entrance reveal.
 *
 * Content visibility is controlled by CSS, not JavaScript state, on purpose:
 *
 * - The hidden start only exists inside a `prefers-reduced-motion:
 *   no-preference` media query, so reduced-motion users are never served
 *   hidden content. An earlier version branched the rendered element type on
 *   a client-only hook, which left the server's `opacity: 0` inline style
 *   stranded on the element after hydration — a blank page for exactly the
 *   users who most need it to work.
 * - A `<noscript>` rule reveals everything when scripts do not run.
 * - Only opacity and transform are animated, so this stays on the compositor
 *   and can never shift layout.
 *
 * Never wrap the LCP element: an element starting at opacity 0 is not counted
 * as painted, which would delay Largest Contentful Paint.
 */
export function Reveal({
  children,
  delay = 0,
  as = "div",
  className,
}: {
  children: ReactNode;
  /** Seconds. Combine with staggerDelay(index) for sibling staggering. */
  delay?: number;
  as?: ElementType;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);
  const Component = as;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Anything already on screen at mount is revealed without waiting for a
    // scroll, which covers deep links and restored scroll positions.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Component
      ref={ref}
      className={cn("reveal", className)}
      data-reveal={shown ? "shown" : "pending"}
      style={delay ? ({ "--reveal-delay": `${delay}s` } as React.CSSProperties) : undefined}
    >
      {children}
    </Component>
  );
}
