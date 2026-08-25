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
import { ArtworkGrid } from "@/components/ui/artwork-grid";
import { HeroWall } from "@/components/home/hero-wall";
import { WallPreviewShowcase } from "@/components/home/wall-preview-showcase";
import { Reveal } from "@/components/motion/reveal";
import { staggerDelay } from "@/components/motion/stagger";

export const metadata: Metadata = {
  alternates: { canonical: absoluteUrl("/") },
};

/**
 * The hero wall, hung in a deliberate order rather than taken from the top of
 * the catalogue: a mix of orientations and palettes so the arrangement reads
 * as curated. The third piece is the visual anchor and the LCP element.
 */
const HERO_SLUGS = [
  "lahore-jaali",
  "monsoon-leaves",
  "meridian-seven",
  "sabr",
  "amber-hour",
  "deep-work",
];

export default function HomePage() {
  const allArtworks = getArtworks();
  const heroPieces = HERO_SLUGS.map((slug) =>
    allArtworks.find((a) => a.slug === slug),
  ).filter((a): a is NonNullable<typeof a> => Boolean(a));
  const collections = getCollections();
  const featured = getFeaturedArtworks().slice(0, 6);
  const venues = getVenues();
  const artworks = allArtworks;
  // A confident, office-appropriate piece for the wall-preview demonstration.
  const showcasePiece = allArtworks.find((a) => a.slug === "meridian-seven");

  return (
    <>
      <HeroWall artworks={heroPieces}>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
          {copy.home.heroEyebrow}
        </p>
        <h1 className="mt-4 max-w-3xl font-display text-[2.6rem] font-medium leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl 2xl:text-[5.5rem]">
          {copy.home.heroTitle}
        </h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-muted sm:text-lg 2xl:text-xl 2xl:leading-8">
          {copy.home.heroSubtitle}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <LinkButton href="/portfolio">{copy.cta.explore}</LinkButton>
          <LinkButton
            href={whatsappLink(copy.contact.inquiryDefaultMessage)}
            external
            variant="outline"
          >
            {copy.cta.whatsapp}
          </LinkButton>
        </div>
      </HeroWall>

      {/* Collections */}
      <section className="py-20 sm:py-28">
        <Container>
          <SectionHeading
            eyebrow={copy.home.collectionsEyebrow}
            title={copy.home.collectionsTitle}
            subtitle={copy.home.collectionsSubtitle}
          />
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((collection, i) => {
              const cover = artworks.find((a) => a.collection === collection.id);
              const blur = cover ? getBlurDataURL(cover.slug) : undefined;
              return (
                <Reveal as="li" key={collection.id} delay={staggerDelay(i)} className="h-full">
                  <Link
                    href={`/collections/${collection.id}`}
                    className="group flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface transition-colors hover:border-ink/30"
                  >
                    {cover && (
                      <div className="flex h-48 items-center justify-center overflow-hidden bg-background p-5">
                        <Image
                          src={cover.image.src}
                          alt={cover.alt}
                          width={cover.image.width}
                          height={cover.image.height}
                          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                          className="h-auto max-h-full w-auto max-w-full object-contain shadow-[0_10px_26px_-14px_rgba(0,0,0,0.45)] transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:group-hover:scale-100"
                          {...(blur ? { placeholder: "blur" as const, blurDataURL: blur } : {})}
                        />
                      </div>
                    )}
                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="font-display text-xl font-medium">{collection.name}</h3>
                      <p className="mt-1 text-sm italic text-muted">{collection.tagline}</p>
                      <p className="mt-2 flex-1 text-sm leading-6 text-muted">
                        {collection.description}
                      </p>
                    </div>
                  </Link>
                </Reveal>
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
          <ArtworkGrid artworks={featured} className="mt-10" />
        </Container>
      </section>

      {showcasePiece && (
        <WallPreviewShowcase
          artwork={showcasePiece}
          eyebrow={copy.home.previewEyebrow}
          title={copy.home.previewTitle}
          subtitle={copy.home.previewSubtitle}
          steps={copy.home.previewSteps}
          ctaLabel={copy.home.previewCta}
        />
      )}

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
            {venues.map((venue, i) => (
              <Reveal as="li" key={venue.id} delay={staggerDelay(i)} className="h-full">
                <Link
                  href={`/portfolio?venue=${venue.id}`}
                  className="block h-full rounded-xl border border-line bg-surface p-5 transition-colors hover:border-accent"
                >
                  <h3 className="font-display text-lg font-medium">{venue.name}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-muted">{venue.pitch}</p>
                </Link>
              </Reveal>
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
