import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { copy } from "@/content/copy";
import { pageMetadata } from "@/lib/seo/metadata";
import {
  getArtworks,
  getBlurDataURL,
  getCollections,
  getOrientationAspect,
} from "@/lib/content";
import { wallColour } from "@/content/finishes";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { JsonLd } from "@/components/seo/jsonld-script";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/motion/reveal";
import { staggerDelay } from "@/components/motion/stagger";

export const metadata: Metadata = pageMetadata({
  title: copy.collections.title,
  description: copy.collections.subtitle,
  path: "/collections",
});

export default function CollectionsPage() {
  const collections = getCollections();
  const artworks = getArtworks();

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: copy.nav.home, path: "/" },
          { name: copy.collections.title, path: "/collections" },
        ])}
      />

      <section className="border-b border-line py-14 sm:py-20">
        <Container>
          <h1 className="font-display text-4xl font-medium tracking-tight sm:text-5xl">
            {copy.collections.title}
          </h1>
          <p className="mt-3 max-w-xl text-base leading-7 text-muted">
            {copy.collections.subtitle}
          </p>
        </Container>
      </section>

      <section className="py-14 sm:py-20">
        <Container>
          <ul className="grid gap-8 md:grid-cols-2">
            {collections.map((collection, i) => {
              const pieces = artworks.filter((a) => a.collection === collection.id);
              const cover = pieces[0];
              const blur = cover ? getBlurDataURL(cover.slug) : undefined;
              return (
                <Reveal as="li" key={collection.id} delay={staggerDelay(i)}>
                  <Link
                    href={`/collections/${collection.id}`}
                    className="group flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface transition-colors hover:border-ink/30"
                  >
                    {cover && (
                      <div
                        className="flex h-56 items-center justify-center overflow-hidden p-6"
                        style={{ backgroundColor: wallColour(cover.wallTone) }}
                      >
                        <Image
                          src={cover.image.src}
                          alt={cover.alt}
                          width={cover.image.width}
                          height={cover.image.height}
                          /* An exact width, derived rather than declared as a
                             vw. The box is h-56 with p-6, so the image is
                             capped at 176px tall and its painted width is that
                             height times the piece's aspect — 132px for a
                             portrait, 235px for a landscape — and it does not
                             change with the viewport at all. A vw value here
                             fetched a 1080px file for a 132px image. */
                          sizes={`${Math.round(176 * getOrientationAspect(cover.orientation))}px`}
                          className="h-auto max-h-full w-auto max-w-full object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.35)] transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:group-hover:scale-100"
                          {...(blur ? { placeholder: "blur" as const, blurDataURL: blur } : {})}
                        />
                      </div>
                    )}
                    <div className="flex flex-1 flex-col p-6">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                        {pieces.length} {pieces.length === 1 ? "piece" : "pieces"}
                      </p>
                      <h2 className="mt-2 font-display text-2xl font-medium">
                        {collection.name}
                      </h2>
                      <p className="mt-1 text-sm italic text-muted">{collection.tagline}</p>
                      <p className="mt-3 flex-1 text-sm leading-6 text-muted">
                        {collection.description}
                      </p>
                      <p className="mt-4 text-sm font-semibold text-accent underline-offset-4 group-hover:underline">
                        {copy.collections.viewCollection}
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
