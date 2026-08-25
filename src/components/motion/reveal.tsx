"use client";

import { useEffect, useRef, useState } from "react";
import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

const OPTIONS: IntersectionObserverInit = {
  threshold: 0.12,
  rootMargin: "0px 0px -6% 0px",
};

let observer: IntersectionObserver | null = null;
const pending = new WeakMap<Element, () => void>();

/**
 * One observer for every reveal on the page rather than one each. The busiest
 * pages carry 25 of these, and 25 observers watching the same viewport with
 * identical options is 25 times the setup for the same answer.
 */
function watch(node: Element, onVisible: () => void) {
  observer ??= new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const callback = pending.get(entry.target);
      pending.delete(entry.target);
      observer?.unobserve(entry.target);
      callback?.();
    }
  }, OPTIONS);

  pending.set(node, onVisible);
  observer.observe(node);

  return () => {
    pending.delete(node);
    observer?.unobserve(node);
  };
}

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
    return watch(node, () => setShown(true));
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
