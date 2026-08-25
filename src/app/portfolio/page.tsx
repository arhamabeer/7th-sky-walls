import type { Metadata } from "next";
import { copy } from "@/content/copy";
import { pageMetadata } from "@/lib/seo/metadata";
import {
  getArtworks,
  getCollections,
  getVenues,
} from "@/lib/content";
import { venueIdSchema } from "@/lib/content/schema";
import { Container } from "@/components/ui/container";
import { ArtworkCard } from "@/components/ui/artwork-card";
import { Chip } from "@/components/ui/chip";

export const metadata: Metadata = pageMetadata({
  title: copy.portfolio.title,
  description: copy.portfolio.subtitle,
  path: "/portfolio",
});

/**
 * Filters are plain crawlable links (?venue= / ?collection=) — real anchors
 * for SEO, server-rendered results, zero client JS.
 */
export default async function PortfolioPage({
  searchParams,
}: PageProps<"/portfolio">) {
  const params = await searchParams;
  const rawVenue = typeof params.venue === "string" ? params.venue : undefined;
  const venue = venueIdSchema.safeParse(rawVenue).data;
  const collectionParam =
    typeof params.collection === "string" ? params.collection : undefined;
  const collections = getCollections();
  const collection = collections.find((c) => c.id === collectionParam)?.id;

  const artworks = getArtworks({ venue, collection });
  const venues = getVenues();

  const filterLink = (next: { venue?: string; collection?: string }) => {
    const q = new URLSearchParams();
    if (next.venue) q.set("venue", next.venue);
    if (next.collection) q.set("collection", next.collection);
    const qs = q.toString();
    return qs ? `/portfolio?${qs}` : "/portfolio";
  };

  return (
    <>
      <section className="border-b border-line py-14 sm:py-20">
        <Container>
          <h1 className="font-display text-4xl font-medium tracking-tight sm:text-5xl">
            {copy.portfolio.title}
          </h1>
          <p className="mt-3 max-w-xl text-base leading-7 text-muted">
            {copy.portfolio.subtitle}
          </p>

          <nav aria-label="Filter by space" className="mt-8">
            <ul className="flex flex-wrap gap-2">
              <li>
                <Chip href={filterLink({ collection })} active={!venue}>
                  {copy.portfolio.filterAllLabel}
                </Chip>
              </li>
              {venues.map((v) => (
                <li key={v.id}>
                  <Chip
                    href={filterLink({ venue: v.id, collection })}
                    active={venue === v.id}
                    ariaCurrent
                  >
                    {v.name}
                  </Chip>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Filter by collection" className="mt-3">
            <ul className="flex flex-wrap gap-2">
              {collections.map((c) => (
                <li key={c.id}>
                  <Chip
                    href={
                      collection === c.id
                        ? filterLink({ venue })
                        : filterLink({ venue, collection: c.id })
                    }
                    active={collection === c.id}
                    ariaCurrent
                  >
                    {c.name}
                  </Chip>
                </li>
              ))}
            </ul>
          </nav>
        </Container>
      </section>

      <section className="py-14 sm:py-20">
        <Container>
          {artworks.length === 0 ? (
            <p className="py-20 text-center text-muted">{copy.portfolio.emptyState}</p>
          ) : (
            <ul className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {artworks.map((artwork) => (
                <li key={artwork.slug}>
                  <ArtworkCard artwork={artwork} />
                </li>
              ))}
            </ul>
          )}
        </Container>
      </section>
    </>
  );
}
