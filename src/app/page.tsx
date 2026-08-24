import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { absoluteUrl, whatsappLink } from "@/config/site.config";
import { copy } from "@/content/copy";
import {
  getArtworks,
  getBlurDataURL,
  getCollections,
  getFeaturedArtworks,
  getVenues,
} from "@/lib/content";
import { Container } from "@/components/ui/container";
import { LinkButton } from "@/components/ui/link-button";
import { SectionHeading } from "@/components/ui/section-heading";
import { ArtworkCard } from "@/components/ui/artwork-card";

export const metadata: Metadata = {
  alternates: { canonical: absoluteUrl("/") },
};

const HERO_ARTWORK_SLUG = "dawn-over-clifton";

export default function HomePage() {
  const heroArtwork = getArtworks().find((a) => a.slug === HERO_ARTWORK_SLUG);
  const heroBlur = heroArtwork ? getBlurDataURL(heroArtwork.slug) : undefined;
  const collections = getCollections();
  const featured = getFeaturedArtworks().slice(0, 6);
  const venues = getVenues();
  const artworks = getArtworks();

  return (
    <>
      {/* Hero — base version; the cinematic scroll treatment lands in a later phase. */}
      <section className="relative flex min-h-[85svh] items-end overflow-hidden">
        {heroArtwork && (
          <Image
            src={heroArtwork.image.src}
            alt={heroArtwork.alt}
            fill
            sizes="100vw"
            fetchPriority="high"
            loading="eager"
            className="object-cover"
            {...(heroBlur ? { placeholder: "blur" as const, blurDataURL: heroBlur } : {})}
          />
        )}
        {/* Scrim guarantees text contrast over any artwork, whatever its palette. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-ink/95 via-ink/70 to-ink/25"
        />
        <Container className="relative pb-16 pt-40 sm:pb-24">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent-soft">
            {copy.home.heroEyebrow}
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-medium leading-[1.05] tracking-tight text-background sm:text-6xl">
            {copy.home.heroTitle}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-background/85 sm:text-lg">
            {copy.home.heroSubtitle}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton href="/portfolio" variant="inverted">
              {copy.cta.explore}
            </LinkButton>
            <LinkButton
              href={whatsappLink(copy.contact.inquiryDefaultMessage)}
              external
              variant="outlineInverted"
            >
              {copy.cta.whatsapp}
            </LinkButton>
          </div>
        </Container>
      </section>

      {/* Collections */}
      <section className="py-20 sm:py-28">
        <Container>
          <SectionHeading
            eyebrow={copy.home.collectionsEyebrow}
            title={copy.home.collectionsTitle}
            subtitle={copy.home.collectionsSubtitle}
          />
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((collection) => {
              const cover = artworks.find((a) => a.collection === collection.id);
              const blur = cover ? getBlurDataURL(cover.slug) : undefined;
              return (
                <li key={collection.id}>
                  <Link
                    href={`/portfolio?collection=${collection.id}`}
                    className="group block overflow-hidden rounded-xl border border-line bg-surface"
                  >
                    {cover && (
                      <div className="relative aspect-[16/10] overflow-hidden bg-line">
                        <Image
                          src={cover.image.src}
                          alt={cover.alt}
                          fill
                          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                          {...(blur ? { placeholder: "blur" as const, blurDataURL: blur } : {})}
                        />
                      </div>
                    )}
                    <div className="p-5">
                      <h3 className="font-display text-xl font-medium">{collection.name}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted">
                        {collection.description}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Container>
      </section>

      {/* Featured works */}
      <section className="border-y border-line bg-surface py-20 sm:py-28">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading
              eyebrow={copy.nav.portfolio}
              title={copy.home.featuredTitle}
              subtitle={copy.home.featuredSubtitle}
            />
            <Link
              href="/portfolio"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-accent underline-offset-4 hover:underline"
            >
              {copy.cta.viewAll}
            </Link>
          </div>
          <ul className="mt-10 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((artwork) => (
              <li key={artwork.slug}>
                <ArtworkCard artwork={artwork} />
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* Venues */}
      <section className="py-20 sm:py-28">
        <Container>
          <SectionHeading
            eyebrow={copy.home.venuesEyebrow}
            title={copy.home.venuesTitle}
            subtitle={copy.home.venuesSubtitle}
            align="center"
          />
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {venues.map((venue) => (
              <li key={venue.id}>
                <Link
                  href={`/portfolio?venue=${venue.id}`}
                  className="block h-full rounded-xl border border-line bg-surface p-5 transition-colors hover:border-accent"
                >
                  <h3 className="font-display text-lg font-medium">{venue.name}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-muted">{venue.pitch}</p>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* Inquiry CTA */}
      <section className="bg-ink py-20 text-background sm:py-24">
        <Container className="text-center">
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-medium tracking-tight sm:text-4xl">
            {copy.home.ctaTitle}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-background/75">
            {copy.home.ctaSubtitle}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <LinkButton href="/contact" variant="inverted">
              {copy.cta.primary}
            </LinkButton>
            <LinkButton
              href={whatsappLink(copy.contact.inquiryDefaultMessage)}
              external
              variant="outlineInverted"
            >
              {copy.cta.whatsapp}
            </LinkButton>
          </div>
        </Container>
      </section>
    </>
  );
}
