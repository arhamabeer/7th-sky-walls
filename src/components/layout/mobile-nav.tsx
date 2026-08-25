"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  const open = openedFor === pathname;
  const setOpen = (next: boolean) => setOpenedFor(next ? pathname : null);

  // Keep the page from scrolling behind the panel.
  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

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

      {open && (
        <nav
          id="mobile-menu"
          aria-label={copy.a11y.mainNav}
          className="fixed inset-x-0 bottom-0 top-16 z-30 overflow-y-auto bg-background px-6 py-8"
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
      )}
    </div>
  );
}
