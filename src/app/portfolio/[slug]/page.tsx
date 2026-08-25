import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { absoluteUrl, mailtoLink, whatsappLink } from "@/config/site.config";
import { artworkInquiryMessage, copy } from "@/content/copy";
import { pageMetadata } from "@/lib/seo/metadata";
import {
  cmToInches,
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
import { ArtworkCard } from "@/components/ui/artwork-card";
import { Chip } from "@/components/ui/chip";

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
    images: [
      {
        url: absoluteUrl(artwork.image.src),
        width: artwork.image.width,
        height: artwork.image.height,
        alt: artwork.alt,
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

  const breadcrumbs = [
    { name: copy.nav.home, path: "/" },
    { name: copy.portfolio.breadcrumbRoot, path: "/portfolio" },
    { name: artwork.title, path: `/portfolio/${artwork.slug}` },
  ];

  return (
    <>
      <JsonLd data={visualArtworkJsonLd(artwork)} />
      <JsonLd data={breadcrumbJsonLd(breadcrumbs)} />

      <Container className="py-10 sm:py-14">
        <nav aria-label={copy.a11y.breadcrumb}>
          <ol className="flex flex-wrap items-center gap-2 text-sm text-muted">
            {breadcrumbs.map((crumb, i) => (
              <li key={crumb.path} className="flex items-center gap-2">
                {i > 0 && <span aria-hidden>/</span>}
                {i < breadcrumbs.length - 1 ? (
                  <Link href={crumb.path} className="hover:text-ink">
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

        <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-14">
          {/* Artwork image */}
          <div
            className={`relative overflow-hidden rounded-xl bg-line ${
              artwork.orientation === "portrait"
                ? "aspect-[4/5]"
                : artwork.orientation === "landscape"
                  ? "aspect-[4/3]"
                  : "aspect-square"
            }`}
          >
            <Image
              src={artwork.image.src}
              alt={artwork.alt}
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              fetchPriority="high"
              loading="eager"
              className="object-cover"
              {...(blur ? { placeholder: "blur" as const, blurDataURL: blur } : {})}
            />
          </div>

          {/* Details */}
          <div>
            {collection && (
              <Link
                href={`/portfolio?collection=${collection.id}`}
                className="text-xs font-semibold uppercase tracking-[0.2em] text-accent hover:underline"
              >
                {collection.name}
              </Link>
            )}
            <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
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

            <div className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted">
                {copy.artwork.sizesTitle}
              </h2>
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
                    <th scope="col" className="py-2 pr-4 font-semibold">Size</th>
                    <th scope="col" className="py-2 pr-4 font-semibold">Centimeters</th>
                    <th scope="col" className="py-2 font-semibold">Inches</th>
                  </tr>
                </thead>
                <tbody>
                  {artwork.sizes.map((sizeId) => {
                    const d = getSizeDimensions(sizeId, artwork.orientation);
                    const isDefault = sizeId === artwork.defaultSize;
                    return (
                      <tr key={sizeId} className="border-b border-line">
                        <th scope="row" className="py-2.5 pr-4 text-left font-medium">
                          {d.label}
                          {isDefault && (
                            <span className="ml-2 text-xs font-normal text-accent">
                              (shown)
                            </span>
                          )}
                        </th>
                        <td className="py-2.5 pr-4 text-muted">
                          {d.widthCm} × {d.heightCm} cm
                        </td>
                        <td className="py-2.5 text-muted">
                          {cmToInches(d.widthCm)}″ × {cmToInches(d.heightCm)}″
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="mt-3 text-xs leading-5 text-muted">{copy.artwork.sizesNote}</p>
            </div>

            <div className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted">
                {copy.artwork.materialsTitle}
              </h2>
              <ul className="mt-3 space-y-1.5 text-sm text-muted">
                {artwork.materials.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>

            <div className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted">
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
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
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
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-20">
            <h2 className="font-display text-2xl font-medium tracking-tight">
              {copy.artwork.moreFromCollection}
            </h2>
            <ul className="mt-6 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((a) => (
                <li key={a.slug}>
                  <ArtworkCard artwork={a} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </Container>
    </>
  );
}
