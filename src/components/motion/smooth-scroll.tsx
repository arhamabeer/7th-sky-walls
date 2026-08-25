"use client";

import { useEffect } from "react";

/**
 * Desktop-only smooth scrolling, mounted imperatively.
 *
 * Two deliberate choices:
 *
 * 1. This renders nothing and wraps nothing. An earlier version swapped
 *    between a Fragment and a provider component once it detected a pointer
 *    device, which changed the element type and remounted the entire app
 *    below it — discarding client state (a deep-linked artwork size was reset)
 *    and re-running every entrance animation.
 *
 * 2. Touch devices keep native scrolling. Lenis interpolates on the main
 *    thread, competing with hydration and 3D work for CPU, which surfaces as
 *    input delay on mid-range phones. Reduced-motion users are excluded too.
 *
 * 3. The library is imported dynamically, inside the branch that uses it. A
 *    static import shipped it to every phone that would never run it — a
 *    library downloaded, parsed and discarded on the devices least able to
 *    afford the main-thread time.
 */
export function SmoothScroll() {
  useEffect(() => {
    const pointerFine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const noPreference = window.matchMedia("(prefers-reduced-motion: no-preference)");

    let lenis: { raf: (time: number) => void; destroy: () => void } | null = null;
    let frame = 0;
    let cancelled = false;

    const start = async () => {
      if (lenis) return;
      const { default: Lenis } = await import("lenis");
      if (cancelled || lenis) return;
      lenis = new Lenis({ duration: 0.9, smoothWheel: true, syncTouch: false });
      const raf = (time: number) => {
        lenis?.raf(time);
        frame = requestAnimationFrame(raf);
      };
      frame = requestAnimationFrame(raf);
    };

    const stop = () => {
      cancelAnimationFrame(frame);
      lenis?.destroy();
      lenis = null;
    };

    const evaluate = () => {
      if (pointerFine.matches && noPreference.matches) void start();
      else stop();
    };

    evaluate();
    pointerFine.addEventListener("change", evaluate);
    noPreference.addEventListener("change", evaluate);

    return () => {
      cancelled = true;
      pointerFine.removeEventListener("change", evaluate);
      noPreference.removeEventListener("change", evaluate);
      stop();
    };
  }, []);

  return null;
}
