import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const VARIANTS = {
  /** Dark solid — the default call to action on light surfaces. */
  primary: "bg-ink text-background hover:opacity-85",
  /** Bordered, for secondary actions on light surfaces. */
  outline: "border border-ink/25 text-ink hover:border-ink",
  /** Light solid, for use on dark surfaces. */
  inverted: "bg-background text-ink hover:opacity-90",
  /** Bordered light, for secondary actions on dark surfaces or imagery. */
  outlineInverted:
    "border border-background/45 text-background hover:border-background hover:bg-background/10",
} as const;

export function LinkButton({
  href,
  children,
  variant = "primary",
  external = false,
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: keyof typeof VARIANTS;
  external?: boolean;
  className?: string;
}) {
  const classes = cn(
    "inline-flex min-h-12 items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition-all",
    VARIANTS[variant],
    className,
  );
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}
