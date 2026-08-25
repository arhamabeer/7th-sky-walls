import Image from "next/image";
import Link from "next/link";
import { site } from "@/config/site.config";
import { copy } from "@/content/copy";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NAV_LINKS } from "@/components/layout/nav-links";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center 2xl:max-w-[84rem] justify-between gap-4 px-4 sm:px-6 2xl:px-10">
        <Link
          href="/"
          className="flex min-h-11 items-center gap-2.5"
          aria-label={site.name}
        >
          <Image src={site.assets.mark} alt="" width={30} height={30} loading="eager" />
          <span className="font-display text-lg font-semibold tracking-tight">
            {site.name}
          </span>
        </Link>

        {/* Shown from tablet up, which includes touch devices — hence the
            44px minimum target height on every link. */}
        <nav aria-label={copy.a11y.mainNav} className="hidden md:block">
          <ul className="flex items-center gap-2 lg:gap-4">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium text-muted transition-colors hover:bg-ink/5 hover:text-ink"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/contact"
            className="hidden min-h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-background transition-opacity hover:opacity-85 md:inline-flex"
          >
            {copy.cta.primary}
          </Link>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
