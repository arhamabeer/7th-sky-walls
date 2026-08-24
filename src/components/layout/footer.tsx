import Image from "next/image";
import Link from "next/link";
import { mailtoLink, site, telLink, whatsappLink } from "@/config/site.config";
import { copy } from "@/content/copy";
import { NAV_LINKS } from "@/components/layout/nav-links";
import { getServices } from "@/lib/content";

const SOCIAL_LABELS: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
};

export function Footer() {
  const services = getServices();
  const socials = Object.entries(site.social).filter(([, url]) => Boolean(url));

  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <Image src={site.assets.mark} alt="" width={26} height={26} />
            <span className="font-display text-lg font-semibold">{site.name}</span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-6 text-muted">{copy.footer.blurb}</p>
        </div>

        <nav aria-label={copy.a11y.footerNav}>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">
            {copy.nav.portfolio}
          </h2>
          <ul className="mt-2">
            {NAV_LINKS.filter((l) => l.href !== "/").map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex min-h-11 items-center text-sm text-ink hover:text-accent"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">
            {copy.nav.services}
          </h2>
          <ul className="mt-2">
            {services.slice(0, 4).map((service) => (
              <li key={service.slug}>
                <Link
                  href={`/services#${service.slug}`}
                  className="inline-flex min-h-11 items-center text-sm text-ink hover:text-accent"
                >
                  {service.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">
            {copy.nav.contact}
          </h2>
          <ul className="mt-2 text-sm">
            <li>
              <a
                href={whatsappLink(copy.contact.inquiryDefaultMessage)}
                className="inline-flex min-h-11 items-center hover:text-accent"
              >
                {copy.cta.whatsapp}
              </a>
            </li>
            <li>
              <a
                href={mailtoLink()}
                className="inline-flex min-h-11 items-center break-all hover:text-accent"
              >
                {site.contact.email}
              </a>
            </li>
            <li>
              <a href={telLink()} className="inline-flex min-h-11 items-center hover:text-accent">
                {site.contact.phone}
              </a>
            </li>
            <li className="pt-2 text-muted">
              {site.contact.address.city}, {site.contact.address.country}
            </li>
          </ul>
          {socials.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-x-4">
              {socials.map(([key, url]) => (
                <li key={key}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center text-sm font-medium text-muted hover:text-accent"
                  >
                    {SOCIAL_LABELS[key] ?? key}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-muted sm:px-6">
          © {new Date().getFullYear()} {site.legalName}. {copy.footer.rights}
        </p>
      </div>
    </footer>
  );
}
