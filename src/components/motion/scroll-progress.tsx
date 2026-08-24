"use client";

import { motion, useScroll, useSpring } from "motion/react";

/**
 * Thin reading-progress bar pinned under the header. Purely decorative, so it
 * is hidden from assistive technology.
 *
 * Visibility is handled in CSS (`.scroll-progress` is display:none under
 * reduced motion) rather than by returning null from a client-only hook.
 * Branching the rendered tree on a hook that differs between server and client
 * leaves hydration to reconcile a structural change, which is the same hazard
 * that stranded hidden styles on reveal targets.
 */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 220,
    damping: 40,
    restDelta: 0.001,
  });

  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="scroll-progress fixed inset-x-0 top-16 z-40 h-0.5 origin-left bg-accent"
    />
  );
}
