import type { Metadata } from "next";
import { copy } from "@/content/copy";
import { pageMetadata } from "@/lib/seo/metadata";
import {
  getArtworks,
  getBlurDataURL,
  getSizeDimensions,
} from "@/lib/content";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { JsonLd } from "@/components/seo/jsonld-script";
import { Container } from "@/components/ui/container";
import { FeatureBoundary } from "@/components/ui/feature-boundary";
import {
  WallPlanner,
  type PlannerArtwork,
} from "@/components/planner/wall-planner";

export const metadata: Metadata = pageMetadata({
  title: copy.planner.title,
  description: copy.planner.subtitle,
  path: "/planner",
});

export default function PlannerPage() {
  // Dimensions are resolved on the server so the size chart stays a
  // server-only concern; the client receives plain numbers.
  const artworks: PlannerArtwork[] = getArtworks().map((artwork) => ({
    slug: artwork.slug,
    title: artwork.title,
    collection: artwork.collection,
    imageSrc: artwork.image.src,
    blurDataURL: getBlurDataURL(artwork.slug),
    defaultSizeId: artwork.defaultSize,
    sizes: artwork.sizes.map((sizeId) => {
      const d = getSizeDimensions(sizeId, artwork.orientation);
      return { id: sizeId, label: d.label, widthCm: d.widthCm, heightCm: d.heightCm };
    }),
  }));

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: copy.nav.home, path: "/" },
          { name: copy.planner.title, path: "/planner" },
        ])}
      />

      <section className="border-b border-line py-14 sm:py-20">
        <Container>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            {copy.planner.eyebrow}
          </p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-medium leading-[1.06] tracking-tight sm:text-5xl">
            {copy.planner.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-muted">
            {copy.planner.subtitle}
          </p>
        </Container>
      </section>

      <section className="py-12 sm:py-16">
        <Container>
          <FeatureBoundary label="wall-planner">
            <WallPlanner artworks={artworks} />
          </FeatureBoundary>
        </Container>
      </section>

      <section className="border-t border-line bg-surface py-12">
        <Container>
          <h2 className="font-display text-2xl font-medium tracking-tight">
            {copy.planner.notesTitle}
          </h2>
          <ul className="mt-5 grid gap-5 md:grid-cols-3">
            {copy.planner.notes.map((note) => (
              <li key={note.title}>
                <h3 className="font-display text-lg font-medium">{note.title}</h3>
                <p className="mt-2 text-sm leading-7 text-muted">{note.text}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>
    </>
  );
}
