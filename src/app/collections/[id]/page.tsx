import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { whatsappLink } from "@/config/site.config";
import { copy } from "@/content/copy";
import { pageMetadata } from "@/lib/seo/metadata";
import {
  getArtworks,
  getCollectionById,
  getCollections,
  getVenueById,
} from "@/lib/content";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { JsonLd } from "@/components/seo/jsonld-script";
import { Container } from "@/components/ui/container";
import { ArtworkGrid } from "@/components/ui/artwork-grid";
import { Chip } from "@/components/ui/chip";
import { LinkButton } from "@/components/ui/link-button";

export async function generateStaticParams() {
  return getCollections().map((c) => ({ id: c.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/collections/[id]">): Promise<Metadata> {
  const { id } = await params;
  const collection = getCollectionById(id);
  if (!collection) return {};
  return pageMetadata({
    title: collection.name,
    description: collection.description,
    path: `/collections/${collection.id}`,
  });
}

export default async function CollectionPage({
  params,
}: PageProps<"/collections/[id]">) {
  const { id } = await params;
  const collection = getCollectionById(id);
  if (!collection) notFound();

  const pieces = getArtworks({ collection: collection.id });

  // Venues any piece in the series is recommended for, in catalog order.
  const venueIds = [...new Set(pieces.flatMap((a) => a.venues))];

  const breadcrumbs = [
    { name: copy.nav.home, path: "/" },
    { name: copy.collections.title, path: "/collections" },
    { name: collection.name, path: `/collections/${collection.id}` },
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

      <section className="border-b border-line pb-12">
        <Container>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            {pieces.length} {pieces.length === 1 ? "piece" : "pieces"} in this series
          </p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
            {collection.name}
          </h1>
          <p className="mt-3 max-w-2xl font-display text-xl italic text-muted">
            {collection.tagline}
          </p>

          <div className="mt-8 grid gap-8 md:grid-cols-[1.5fr_1fr]">
            <p className="text-base leading-8 text-muted">{collection.story}</p>
            <div className="rounded-xl border border-line bg-surface p-6">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">
                {copy.collections.bestForTitle}
              </h2>
              <p className="mt-3 text-sm leading-6">{collection.bestFor}</p>
              {venueIds.length > 0 && (
                <ul className="mt-5 flex flex-wrap gap-2">
                  {venueIds.map((venueId) => {
                    const venue = getVenueById(venueId);
                    if (!venue) return null;
                    return (
                      <li key={venueId}>
                        <Chip href={`/portfolio?venue=${venueId}`}>{venue.name}</Chip>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </Container>
      </section>

      <section className="py-12 sm:py-16">
        <Container>
          <h2 className="sr-only">Artworks in {collection.name}</h2>
          <ArtworkGrid artworks={pieces} showCollection={false} />
        </Container>
      </section>

      <section className="border-t border-line bg-surface py-14">
        <Container className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <h2 className="font-display text-2xl font-medium tracking-tight">
              {copy.collections.ctaTitle}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
              {copy.collections.ctaSubtitle}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <LinkButton href="/contact">{copy.cta.primary}</LinkButton>
            <LinkButton
              href={whatsappLink(
                `Hello — I'd like to discuss the ${collection.name} series for my space.`,
              )}
              external
              variant="outline"
            >
              {copy.cta.whatsapp}
            </LinkButton>
          </div>
        </Container>
      </section>
    </>
  );
}
