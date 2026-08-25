import Image from "next/image";
import Link from "next/link";
import { copy } from "@/content/copy";
import { getFeaturedArtworks, getBlurDataURL } from "@/lib/content";
import { wallColour } from "@/content/finishes";
import { Container } from "@/components/ui/container";
import { LinkButton } from "@/components/ui/link-button";

/**
 * Not-found page.
 *
 * A dead end on a portfolio is a lost inquiry, so this offers real ways
 * onward — the collections, the spaces, the planner — and shows a few pieces
 * rather than apologising into empty space. The default Next.js page is
 * unbranded and offers nothing.
 */
export default function NotFound() {
  const suggestions = getFeaturedArtworks().slice(0, 3);

  return (
    <section className="py-16 sm:py-24">
      <Container>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          {copy.notFound.eyebrow}
        </p>
        <h1 className="mt-3 max-w-2xl font-display text-4xl font-medium leading-[1.06] tracking-tight sm:text-5xl">
          {copy.notFound.title}
        </h1>
        <p className="mt-4 max-w-xl text-base leading-8 text-muted">
          {copy.notFound.body}
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <LinkButton href="/portfolio">{copy.cta.explore}</LinkButton>
          <LinkButton href="/contact" variant="outline">
            {copy.cta.primary}
          </LinkButton>
        </div>

        <nav aria-label={copy.notFound.linksLabel} className="mt-10">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {[
              { href: "/collections", label: copy.collections.title },
              { href: "/spaces", label: copy.spaces.title },
              { href: "/planner", label: copy.planner.title },
              { href: "/services", label: copy.nav.services },
              { href: "/about", label: copy.nav.about },
            ].map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex min-h-11 items-center font-semibold text-accent underline-offset-4 hover:underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {suggestions.length > 0 && (
          <div className="mt-14 border-t border-line pt-10">
            <h2 className="font-display text-2xl font-medium tracking-tight">
              {copy.notFound.suggestionsTitle}
            </h2>
            <ul className="mt-6 grid gap-x-5 gap-y-8 sm:grid-cols-3">
              {suggestions.map((artwork) => {
                const blur = getBlurDataURL(artwork.slug);
                return (
                  <li key={artwork.slug}>
                    <Link
                      href={`/portfolio/${artwork.slug}`}
                      className="group flex flex-col"
                    >
                      <div
                        className="flex h-56 items-center justify-center overflow-hidden rounded-xl border border-line p-6"
                        style={{ backgroundColor: wallColour(artwork.wallTone) }}
                      >
                        <Image
                          src={artwork.image.src}
                          alt={artwork.alt}
                          width={artwork.image.width}
                          height={artwork.image.height}
                          sizes="(min-width: 640px) 30vw, 90vw"
                          className="h-auto max-h-full w-auto max-w-full object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.35)] transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:group-hover:scale-100"
                          {...(blur ? { placeholder: "blur" as const, blurDataURL: blur } : {})}
                        />
                      </div>
                      <h3 className="mt-3 font-display text-lg font-medium">
                        {artwork.title}
                      </h3>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </Container>
    </section>
  );
}
