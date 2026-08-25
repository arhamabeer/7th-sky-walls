"use client";

import { useEffect } from "react";

/**
 * Applies scroll parallax to elements carrying `data-parallax="<speed>"`
 * within a container.
 *
 * Deliberately imperative and stateless. Two reasons:
 *
 * - The markup is server-rendered and never differs between server and
 *   client, so there is no hydration divergence to reconcile. Branching a
 *   rendered tree on a client-only value like reduced-motion has already
 *   stranded styles once in this codebase.
 * - Only `transform` is written, inside a rAF, so the work stays on the
 *   compositor and cannot shift layout.
 *
 * Disabled entirely on touch devices and under reduced motion. Parallax on a
 * phone costs main-thread time during the one interaction — scrolling — where
 * mid-range hardware has none to spare, and buys very little on a small
 * screen.
 */
export function ScrollParallax({ containerId }: { containerId: string }) {
  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const pointerFine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const noPreference = window.matchMedia("(prefers-reduced-motion: no-preference)");

    let frame = 0;
    let attached = false;
    const targets: Array<{ el: HTMLElement; speed: number }> = [];

    const collect = () => {
      targets.length = 0;
      for (const el of container.querySelectorAll<HTMLElement>("[data-parallax]")) {
        const speed = Number(el.dataset.parallax);
        if (Number.isFinite(speed) && speed !== 0) targets.push({ el, speed });
      }
    };

    const apply = () => {
      frame = 0;
      const progress = window.scrollY;
      for (const { el, speed } of targets) {
        el.style.transform = `translate3d(0, ${(progress * speed).toFixed(2)}px, 0)`;
      }
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };

    const clear = () => {
      for (const { el } of targets) el.style.transform = "";
    };

    const attach = () => {
      if (attached) return;
      collect();
      window.addEventListener("scroll", onScroll, { passive: true });
      attached = true;
      apply();
    };

    const detach = () => {
      if (!attached) return;
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
      frame = 0;
      clear();
      attached = false;
    };

    const evaluate = () => {
      if (pointerFine.matches && noPreference.matches) attach();
      else detach();
    };

    evaluate();
    pointerFine.addEventListener("change", evaluate);
    noPreference.addEventListener("change", evaluate);

    return () => {
      pointerFine.removeEventListener("change", evaluate);
      noPreference.removeEventListener("change", evaluate);
      detach();
    };
  }, [containerId]);

  return null;
}
