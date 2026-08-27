import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { copy } from "@/content/copy";
import { pageMetadata } from "@/lib/seo/metadata";
import { getArtworks, getBlurDataURL, getVenuePreview, getVenues } from "@/lib/content";
import { wallColour } from "@/content/finishes";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { JsonLd } from "@/components/seo/jsonld-script";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/motion/reveal";
import { staggerDelay } from "@/components/motion/stagger";

export const metadata: Metadata = pageMetadata({
  title: copy.spaces.title,
  description: copy.spaces.subtitle,
  path: "/spaces",
});

export default function SpacesPage() {
  const venues = getVenues();

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: copy.nav.home, path: "/" },
          { name: copy.spaces.title, path: "/spaces" },
        ])}
      />

      <section className="border-b border-line py-14 sm:py-20">
        <Container>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            {copy.spaces.eyebrow}
          </p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-medium leading-[1.06] tracking-tight sm:text-5xl">
            {copy.spaces.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-muted">
            {copy.spaces.subtitle}
          </p>
        </Container>
      </section>

      <section className="py-14 sm:py-20">
        <Container>
          <ul className="grid gap-8 md:grid-cols-2">
            {venues.map((venue, i) => {
              const pieces = getArtworks({ venue: venue.id });
              const count = pieces.length;
              /**
               * The three pieces are drawn at their own proportions rather than
               * cropped to a common box, so the row reads as an arrangement on a
               * wall — which is what the page is actually about. A panorama ends
               * up width-limited and a portrait height-limited, as on a real wall.
               */
              const preview = getVenuePreview(venue.id, 3);
              return (
                <Reveal as="li" key={venue.id} delay={staggerDelay(i)}>
                  <Link
                    href={`/spaces/${venue.id}`}
                    className="group flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface transition-colors hover:border-ink/30"
                  >
                    {preview.length > 0 && (
                      <div
                        aria-hidden
                        className="flex h-44 items-center justify-center gap-4 px-6 sm:gap-6"
                      >
                        {preview.map((artwork) => {
                          const blur = getBlurDataURL(artwork.slug);
                          return (
                            // Each piece gets an equal share of the row, so
                            // three of them plus the gaps always fit whatever
                            // the card is. Sizing the images by percentage
                            // instead overflows once the gaps are counted.
                            // Each piece carries its own wall tone, so a row
                            // mixing a dark-wall piece with a light-wall one
                            // shows both against the wall they are made for.
                            <span
                              key={artwork.slug}
                              className="flex min-w-0 flex-1 items-center justify-center self-stretch"
                              style={{ backgroundColor: wallColour(artwork.wallTone) }}
                            >
                              <Image
                                src={artwork.image.src}
                                alt=""
                                width={artwork.image.width}
                                height={artwork.image.height}
                                sizes="(min-width: 768px) 11vw, 26vw"
                                className="h-auto max-h-28 w-auto max-w-full object-contain drop-shadow-[0_8px_14px_rgba(0,0,0,0.32)] transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:group-hover:scale-100"
                                {...(blur
                                  ? { placeholder: "blur" as const, blurDataURL: blur }
                                  : {})}
                              />
                            </span>
                          );
                        })}
                      </div>
                    )}
                    <div className="flex flex-1 flex-col p-6 sm:p-8">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                        {count} {count === 1 ? "piece" : "pieces"}
                      </p>
                      <h2 className="mt-3 font-display text-2xl font-medium">
                        {venue.name}
                      </h2>
                      <p className="mt-2 font-display text-lg italic leading-snug text-muted">
                        {venue.headline}
                      </p>
                      <p className="mt-4 flex-1 text-sm leading-7 text-muted">
                        {venue.intro.split(". ")[0]}.
                      </p>
                      <p className="mt-5 text-sm font-semibold text-accent underline-offset-4 group-hover:underline">
                        {copy.spaces.viewSpace}
                      </p>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </ul>
        </Container>
      </section>
    </>
  );
}
