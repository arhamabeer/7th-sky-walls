"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * Keep Tab inside an overlay while it is open.
 *
 * Both overlays on the site are divs with `role="dialog"` and
 * `aria-modal="true"` rather than native `<dialog>` elements, which means the
 * trapping a real modal gets for free has to be written. Without it the ARIA
 * makes a promise the behaviour does not keep: Tab walks out of the overlay
 * into the page behind it, so a keyboard user is moved through content they
 * cannot see and cannot get back from except by guessing.
 *
 * Listens in the capture phase so it settles Tab before anything inside the
 * overlay handles the key, and recomputes the focusable set on every press
 * because these overlays add and remove controls as their state changes — a
 * list captured once goes stale the moment the camera starts.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const root = ref.current;
      if (!root) return;

      const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => el.getClientRects().length > 0,
      );
      if (items.length === 0) {
        // Nothing to focus inside, so the only correct move is to stay put.
        event.preventDefault();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;
      const outside = !(current instanceof Node) || !root.contains(current);

      if (event.shiftKey) {
        if (outside || current === first) {
          event.preventDefault();
          last.focus();
        }
        return;
      }
      if (outside || current === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [ref, active]);
}
