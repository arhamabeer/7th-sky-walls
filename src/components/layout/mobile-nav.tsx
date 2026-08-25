"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { copy } from "@/content/copy";
import { NAV_LINKS } from "@/components/layout/nav-links";

export function MobileNav() {
  const pathname = usePathname();
  /**
   * The menu is open only for the route it was opened on, so any navigation
   * (including browser back) closes it without a state-syncing effect.
   */
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  /**
   * Height of the sticky header, measured when the menu opens.
   *
   * Not hardcoded: the header grows with the studio name, so a fixed 4rem inset
   * leaves a gap under a two-line wordmark. Measured once per open, which is
   * exact and costs nothing.
   */
  const [headerHeight, setHeaderHeight] = useState(64);
  const open = openedFor === pathname;

  const setOpen = (next: boolean) => {
    if (next) {
      const header = document.querySelector("header");
      if (header) setHeaderHeight(header.getBoundingClientRect().height);
    }
    setOpenedFor(next ? pathname : null);
  };

  // Keep the page from scrolling behind the panel.
  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  /**
   * The panel is rendered into `document.body`, not where this component sits.
   *
   * The header carries `backdrop-filter: blur(12px)` for its translucency, and
   * a backdrop-filter makes an element the containing block for every
   * fixed-position descendant. So a panel nested inside the header resolved
   * `top: 4rem; bottom: 0` against the header's own 65px box instead of the
   * viewport: the box collapsed to 64px tall while its content needed 505px,
   * and `overflow-y: auto` turned the whole menu into a scrollable sliver
   * rather than failing visibly. A portal puts it back on the viewport.
   *
   * Kept below the header's z-index on purpose — the button that closes it lives
   * in the header, which therefore has to stay on top and clickable.
   */
  const panel = open ? (
    <nav
      id="mobile-menu"
      aria-label={copy.a11y.mainNav}
      className="fixed inset-0 z-30 overflow-y-auto overscroll-contain bg-background px-6 pb-10 md:hidden"
      style={{ paddingTop: `${headerHeight + 24}px` }}
    >
      <ul className="flex flex-col gap-2">
        {NAV_LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="block border-b border-line py-4 font-display text-2xl font-medium"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href="/contact"
        className="mt-8 block rounded-full bg-ink px-6 py-3.5 text-center text-base font-semibold text-background"
      >
        {copy.cta.primary}
      </Link>
    </nav>
  ) : null;

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? copy.a11y.closeMenu : copy.a11y.openMenu}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-line"
      >
        <span aria-hidden className="relative block h-3.5 w-5">
          <span
            className={`absolute left-0 top-0 h-0.5 w-full bg-ink transition-transform duration-200 ${open ? "translate-y-[6px] rotate-45" : ""}`}
          />
          <span
            className={`absolute left-0 top-[6px] h-0.5 w-full bg-ink transition-opacity duration-200 ${open ? "opacity-0" : ""}`}
          />
          <span
            className={`absolute left-0 top-[12px] h-0.5 w-full bg-ink transition-transform duration-200 ${open ? "-translate-y-[6px] -rotate-45" : ""}`}
          />
        </span>
      </button>

      {/* Only ever reached after a click, so document.body exists — but guarded
          so this stays safe if it is ever rendered during SSR. */}
      {typeof document !== "undefined" && panel
        ? createPortal(panel, document.body)
        : null}
    </div>
  );
}
