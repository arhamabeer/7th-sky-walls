import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { whatsappLink } from "@/config/site.config";
import { copy } from "@/content/copy";
import { pageMetadata } from "@/lib/seo/metadata";
import {
  getArtworks,
  getBlurDataURL,
  getCaseStudies,
  getMaterials,
  getServices,
  getSizeDimensions,
  getVenueById,
  getVenues,
} from "@/lib/content";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { JsonLd } from "@/components/seo/jsonld-script";
import { Container } from "@/components/ui/container";
import { ArtworkGrid } from "@/components/ui/artwork-grid";
import { LinkButton } from "@/components/ui/link-button";
import { Chip } from "@/components/ui/chip";
import { RoomScalePreview } from "@/components/artwork/room-scale-preview";
import { Reveal } from "@/components/motion/reveal";
import { staggerDelay } from "@/components/motion/stagger";
import type { VenueId } from "@/lib/content/schema";

export async function generateStaticParams() {
  return getVenues().map((v) => ({ venue: v.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/spaces/[venue]">): Promise<Metadata> {
  const { venue: id } = await params;
  const venue = getVenueById(id);
  if (!venue) return {};
  return pageMetadata({
    title: `Wall art for ${venue.name.toLowerCase()}`,
    description: venue.intro.slice(0, 155),
    path: `/spaces/${venue.id}`,
  });
}

/**
 * A landing page per kind of space.
 *
 * These exist because "what should go on an office wall" and "what should go
 * on a school corridor" are genuinely different questions, and answering them
 * is the part of this business a filter link cannot do. Every competitor
 * studied offers venue categories that are just product grids; the
 * considerations here are the difference.
 */
export default async function SpacePage({ params }: PageProps<"/spaces/[venue]">) {
  const { venue: id } = await params;
  const venue = getVenueById(id);
  if (!venue) notFound();

  const venueId = venue.id as VenueId;
  const pieces = getArtworks({ venue: venueId });
  const services = getServices().filter((s) => s.idealFor.includes(venueId));
  const caseStudy = getCaseStudies().find((c) => c.venue === venueId);
  const materials = getMaterials();
  const showcase = pieces[0];
  const showcaseSize = showcase
    ? getSizeDimensions(showcase.defaultSize, showcase.orientation)
    : null;

  const breadcrumbs = [
    { name: copy.nav.home, path: "/" },
    { name: copy.spaces.title, path: "/spaces" },
    { name: venue.name, path: `/spaces/${venue.id}` },
  ];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(breadcrumbs)} />

      <Container className="py-6 sm:py-10">
        <nav aria-label={copy.a11y.breadcrumb}>
          <ol className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
            {breadcrumbs.map((crumb, i) => (
              <li key={crumb.path} className="flex items-center gap-2">
                {i > 0 && <span aria-hidden>/</span>}
                {i < breadcrumbs.length - 1 ? (
                  <Link
                    href={crumb.path}
                    className="inline-flex min-h-11 items-center hover:text-ink"
                  >
                    {crumb.name}
                  </Link>
                ) : (
                  <span aria-current="page" className="text-ink">
                    {crumb.name}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      </Container>

      <section className="border-b border-line pb-14">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-16">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                {venue.name}
              </p>
              <h1 className="mt-3 max-w-2xl font-display text-4xl font-medium leading-[1.06] tracking-tight sm:text-5xl">
                {venue.headline}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-muted">
                {venue.intro}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <LinkButton href="/contact">{copy.cta.primary}</LinkButton>
                <LinkButton
                  href={whatsappLink(
                    `Hello — I'm looking at wall art for a ${venue.name.toLowerCase().replace(/s$/, "")}.`,
                  )}
                  external
                  variant="outline"
                >
                  {copy.cta.whatsapp}
                </LinkButton>
              </div>
            </div>

            {showcase && showcaseSize && (
              <RoomScalePreview
                imageSrc={showcase.image.src}
                imageAlt={showcase.alt}
                widthCm={showcaseSize.widthCm}
                heightCm={showcaseSize.heightCm}
                sceneId={venue.scene}
                blurDataURL={getBlurDataURL(showcase.slug)}
              />
            )}
          </div>
        </Container>
      </section>

      {/* The part a filter link cannot do. */}
      <section className="py-14 sm:py-20">
        <Container>
          <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
            {copy.spaces.considerationsTitle}
          </h2>
          <ul className="mt-8 grid gap-5 md:grid-cols-3">
            {venue.considerations.map((item, i) => (
              <Reveal as="li" key={item.title} delay={staggerDelay(i)} className="h-full">
                <div className="h-full rounded-xl border border-line bg-surface p-6">
                  <h3 className="font-display text-lg font-medium">{item.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted">{item.text}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </Container>
      </section>

      <section className="border-y border-line bg-surface py-14 sm:py-20">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
                {copy.spaces.worksTitle} {venue.name.toLowerCase()}
              </h2>
              <p className="mt-2 text-base leading-7 text-muted">
                {pieces.length} {pieces.length === 1 ? "piece" : "pieces"} we would
                put forward first.
              </p>
            </div>
            <Link
              href={`/portfolio?venue=${venue.id}`}
              className="inline-flex min-h-11 items-center text-sm font-semibold text-accent underline-offset-4 hover:underline"
            >
              {copy.cta.viewAll}
            </Link>
          </div>
          <ArtworkGrid artworks={pieces.slice(0, 6)} className="mt-8" />
        </Container>
      </section>

      {services.length > 0 && (
        <section className="py-14 sm:py-20">
          <Container>
            <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
              {copy.spaces.servicesTitle}
            </h2>
            <ul className="mt-8 grid gap-5 md:grid-cols-2">
              {services.map((service, i) => (
                <Reveal as="li" key={service.slug} delay={staggerDelay(i)} className="h-full">
                  <Link
                    href={`/services#${service.slug}`}
                    className="flex h-full flex-col rounded-xl border border-line bg-surface p-6 transition-colors hover:border-ink/30"
                  >
                    <h3 className="font-display text-xl font-medium">{service.name}</h3>
                    <p className="mt-2 flex-1 text-sm leading-6 text-muted">
                      {service.summary}
                    </p>
                    <p className="mt-4 border-t border-line pt-4 text-xs leading-5 text-muted">
                      {service.leadTime}
                    </p>
                  </Link>
                </Reveal>
              ))}
            </ul>
          </Container>
        </section>
      )}

      <section className="border-t border-line bg-surface py-14 sm:py-20">
        <Container>
          <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
            {copy.spaces.materialsTitle}
          </h2>
          <p className="mt-2 max-w-2xl text-base leading-7 text-muted">
            {copy.spaces.materialsSubtitle}
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {materials.map((material, i) => (
              <Reveal as="li" key={material.id} delay={staggerDelay(i)} className="h-full">
                <div className="h-full rounded-xl border border-line bg-background p-5">
                  <h3 className="font-display text-lg font-medium">{material.name}</h3>
                  <p className="mt-1 font-mono text-xs uppercase tracking-wider text-accent">
                    {material.spec}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-muted">{material.bestFor}</p>
                  <p className="mt-3 border-t border-line pt-3 text-xs leading-5 text-muted">
                    <span className="font-semibold text-accent">In fire: </span>
                    {material.fire}
                  </p>
                </div>
              </Reveal>
            ))}
          </ul>
          <p className="mt-6 text-sm text-muted">
            <Link
              href="/about"
              className="inline-flex min-h-11 items-center font-semibold text-accent underline-offset-4 hover:underline"
            >
              {copy.spaces.materialsLink}
            </Link>
          </p>
        </Container>
      </section>

      {caseStudy && (
        <section className="py-14 sm:py-20">
          <Container>
            <article className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                {venue.name} · {caseStudy.location}
              </p>
              <h2 className="mt-3 font-display text-3xl font-medium tracking-tight sm:text-4xl">
                {caseStudy.title}
              </h2>
              <p className="mt-4 text-base leading-8 text-muted">{caseStudy.summary}</p>
              <p className="mt-4 font-display text-lg italic">{caseStudy.outcome}</p>
              {caseStudy.isPlaceholder && (
                <p className="mt-4 text-xs italic text-muted">
                  {copy.about.placeholderNote}
                </p>
              )}
            </article>
          </Container>
        </section>
      )}

      <section className="bg-ink py-14 text-background sm:py-20">
        <Container className="flex flex-wrap items-center justify-between gap-8">
          <div>
            <h2 className="max-w-xl font-display text-3xl font-medium tracking-tight sm:text-4xl">
              {copy.spaces.ctaTitle}
            </h2>
            <p className="mt-3 max-w-xl text-base leading-7 text-background/75">
              {copy.spaces.ctaSubtitle}
            </p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {getVenues()
                .filter((v) => v.id !== venue.id)
                .map((other) => (
                  <li key={other.id}>
                    <Chip href={`/spaces/${other.id}`}>{other.name}</Chip>
                  </li>
                ))}
            </ul>
          </div>
          <div className="flex flex-wrap gap-3">
            <LinkButton href="/contact" variant="inverted">
              {copy.cta.primary}
            </LinkButton>
          </div>
        </Container>
      </section>
    </>
  );
}
