import type { Metadata } from "next";
import Link from "next/link";
import { copy } from "@/content/copy";
import { pageMetadata } from "@/lib/seo/metadata";
import { getArtworks, getVenues } from "@/lib/content";
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
          <ul className="grid gap-5 md:grid-cols-2">
            {venues.map((venue, i) => {
              const count = getArtworks({ venue: venue.id }).length;
              return (
                <Reveal as="li" key={venue.id} delay={staggerDelay(i)} className="h-full">
                  <Link
                    href={`/spaces/${venue.id}`}
                    className="flex h-full flex-col rounded-xl border border-line bg-surface p-6 transition-colors hover:border-ink/30 sm:p-8"
                  >
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
