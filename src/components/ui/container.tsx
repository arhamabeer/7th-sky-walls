import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Page container.
 *
 * Widens on very large monitors. At 2560px a 1152px container leaves the site
 * marooned in the middle of the screen with roughly half the display empty —
 * which reads as a page that was never considered above laptop size. Prose
 * columns keep their own narrower max-widths, so line length stays readable
 * while imagery and grids get the room.
 */
export function Container({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-6xl px-4 sm:px-6 2xl:max-w-[84rem] 2xl:px-10",
        className,
      )}
    >
      {children}
    </div>
  );
}
