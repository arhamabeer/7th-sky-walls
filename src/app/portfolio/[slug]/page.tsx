import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { absoluteUrl, mailtoLink, whatsappLink } from "@/config/site.config";
import { artworkInquiryMessage, copy } from "@/content/copy";
import { pageMetadata } from "@/lib/seo/metadata";
import {
  cmToInches,
  getAdjacentArtworks,
  getArtworkBySlug,
  getArtworks,
  getBlurDataURL,
  getCollectionById,
  getSizeDimensions,
  getVenueById,
} from "@/lib/content";
import { breadcrumbJsonLd, visualArtworkJsonLd } from "@/lib/seo/jsonld";
import { JsonLd } from "@/components/seo/jsonld-script";
import { Container } from "@/components/ui/container";
import { LinkButton } from "@/components/ui/link-button";
import { ArtworkGrid } from "@/components/ui/artwork-grid";
import { Chip } from "@/components/ui/chip";
import {
  ArtworkExperience,
  type SizeOption,
} from "@/components/artwork/artwork-experience";
import { sceneForVenue } from "@/components/artwork/room-scenes";
import { ArtworkPager } from "@/components/artwork/artwork-pager";

export async function generateStaticParams() {
  return getArtworks().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/portfolio/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const artwork = getArtworkBySlug(slug);
  if (!artwork) return {};
  return pageMetadata({
    title: artwork.title,
    description: artwork.description,
    path: `/portfolio/${artwork.slug}`,
    // Pre-composed share card (see scripts/generate-placeholders.mjs). It
    // carries no brand name — og:site_name supplies that — so a rebrand never
    // requires regenerating image assets.
    images: [
      {
        url: absoluteUrl(`/og/${artwork.slug}.jpg`),
        width: 1200,
        height: 630,
        alt: `${artwork.title} — ${artwork.alt}`,
      },
    ],
  });
}

export default async function ArtworkPage({
  params,
}: PageProps<"/portfolio/[slug]">) {
  const { slug } = await params;
  const artwork = getArtworkBySlug(slug);
  if (!artwork) notFound();

  const collection = getCollectionById(artwork.collection);
  const blur = getBlurDataURL(artwork.slug);
  const related = getArtworks({ collection: artwork.collection })
    .filter((a) => a.slug !== artwork.slug)
    .slice(0, 3);
  const adjacent = getAdjacentArtworks(artwork.slug);

  // Physical dimensions are resolved on the server so the size chart stays a
  // server-only concern; the client only receives plain numbers.
  const sizeOptions: SizeOption[] = artwork.sizes.map((sizeId) => {
    const d = getSizeDimensions(sizeId, artwork.orientation);
    return {
      id: sizeId,
      label: d.label,
      widthCm: d.widthCm,
      heightCm: d.heightCm,
      widthIn: cmToInches(d.widthCm),
      heightIn: cmToInches(d.heightCm),
    };
  });

  const breadcrumbs = [
    { name: copy.nav.home, path: "/" },
    { name: copy.portfolio.breadcrumbRoot, path: "/portfolio" },
    { name: artwork.title, path: `/portfolio/${artwork.slug}` },
  ];

  return (
    <>
      <JsonLd data={visualArtworkJsonLd(artwork)} />
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

        <div className="mt-4">
          <ArtworkExperience
            title={artwork.title}
            imageSrc={artwork.image.src}
            imageAlt={artwork.alt}
            imageWidth={artwork.image.width}
            imageHeight={artwork.image.height}
            orientation={artwork.orientation}
            blurDataURL={blur}
            sizes={sizeOptions}
            defaultSizeId={artwork.defaultSize}
            defaultSceneId={sceneForVenue(artwork.venues[0]).id}
            sizeNote={copy.artwork.sizesNote}
          >
            {collection && (
              <Link
                href={`/portfolio?collection=${collection.id}`}
                className="inline-flex min-h-11 items-center text-xs font-semibold uppercase tracking-[0.2em] text-accent hover:underline"
              >
                {collection.name}
              </Link>
            )}
            <h1 className="mt-1 font-display text-3xl font-medium tracking-tight sm:text-4xl">
              {artwork.title}
            </h1>
            {artwork.customText && (
              <p className="mt-3 inline-block rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                {copy.artwork.customizableBadge}
              </p>
            )}
            <p className="mt-4 text-base leading-7 text-muted">{artwork.description}</p>
            {artwork.customText && (
              <p className="mt-3 text-sm leading-6 text-muted">
                {copy.artwork.customizableNote}
              </p>
            )}
          </ArtworkExperience>
        </div>

        <div className="mt-14 grid gap-10 border-t border-line pt-10 sm:grid-cols-2 lg:grid-cols-3">
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted">
              {copy.artwork.sizesTitle}
            </h2>
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
                  <th scope="col" className="py-2 pr-3 font-semibold">Size</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">cm</th>
                  <th scope="col" className="py-2 font-semibold">in</th>
                </tr>
              </thead>
              <tbody>
                {sizeOptions.map((s) => (
                  <tr key={s.id} className="border-b border-line">
                    <th scope="row" className="py-2.5 pr-3 text-left font-medium">
                      {s.label}
                    </th>
                    <td className="py-2.5 pr-3 text-muted">
                      {s.widthCm} × {s.heightCm}
                    </td>
                    <td className="py-2.5 text-muted">
                      {s.widthIn}″ × {s.heightIn}″
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted">
              {copy.artwork.materialsTitle}
            </h2>
            <ul className="mt-3 space-y-1.5 text-sm text-muted">
              {artwork.materials.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>

            <h2 className="mt-8 text-sm font-semibold uppercase tracking-widest text-muted">
              {copy.artwork.venuesTitle}
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {artwork.venues.map((venueId) => {
                const venue = getVenueById(venueId);
                if (!venue) return null;
                return (
                  <li key={venueId}>
                    <Chip href={`/portfolio?venue=${venueId}`}>{venue.name}</Chip>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="rounded-xl border border-line bg-surface p-6">
            <h2 className="font-display text-xl font-medium">Interested in this piece?</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Tell us your wall dimensions and we&apos;ll come back with a mockup in
              your space.
            </p>
            <div className="mt-5 flex flex-col gap-3">
              <LinkButton href={whatsappLink(artworkInquiryMessage(artwork.title))} external>
                {copy.cta.inquireArtwork}
              </LinkButton>
              <LinkButton
                href={mailtoLink(`Inquiry: ${artwork.title}`)}
                external
                variant="outline"
              >
                {copy.cta.email}
              </LinkButton>
            </div>
          </section>
        </div>

        {related.length > 0 && (
          <section className="mt-16 border-t border-line pt-10">
            <h2 className="font-display text-2xl font-medium tracking-tight">
              {copy.artwork.moreFromCollection}
            </h2>
            <ArtworkGrid artworks={related} className="mt-6" />
          </section>
        )}

        {adjacent && (
          <ArtworkPager previous={adjacent.previous} next={adjacent.next} />
        )}
      </Container>
    </>
  );
}
