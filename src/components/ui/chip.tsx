import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Filter/tag pill. min-h-11 keeps it a comfortable touch target on phones,
 * which is where most of this site's traffic browses.
 */
export function Chip({
  href,
  children,
  active = false,
  ariaCurrent = false,
}: {
  href: string;
  children: ReactNode;
  active?: boolean;
  ariaCurrent?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={ariaCurrent && active ? "page" : undefined}
      className={cn(
        "inline-flex min-h-11 items-center rounded-full border px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "border-ink bg-ink text-background"
          : "border-line bg-surface text-muted hover:border-ink hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}
