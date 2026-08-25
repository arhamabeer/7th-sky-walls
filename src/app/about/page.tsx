import type { Metadata } from "next";
import Image from "next/image";
import { copy } from "@/content/copy";
import { site } from "@/config/site.config";
import { pageMetadata } from "@/lib/seo/metadata";
import {
  getArtworkBySlug,
  getBlurDataURL,
  getCaseStudies,
  getMaterials,
  getVenueById,
} from "@/lib/content";
import { Container } from "@/components/ui/container";
import { LinkButton } from "@/components/ui/link-button";
import { Reveal } from "@/components/motion/reveal";
import { staggerDelay } from "@/components/motion/stagger";

export const metadata: Metadata = pageMetadata({
  title: copy.about.title,
  description: copy.about.subtitle,
  path: "/about",
});

/** A quiet, architectural piece to sit beside the studio story. */
const STORY_ARTWORK = "caravanserai";

export default function AboutPage() {
  const caseStudies = getCaseStudies();
  const materials = getMaterials();
  const storyArtwork = getArtworkBySlug(STORY_ARTWORK);
  const storyBlur = storyArtwork ? getBlurDataURL(storyArtwork.slug) : undefined;

  return (
    <>
      <section className="border-b border-line py-16 sm:py-24">
        <Container>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            {copy.about.eyebrow}
          </p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-medium leading-[1.06] tracking-tight sm:text-6xl">
            {copy.about.subtitle}
          </h1>
        </Container>
      </section>

      {/* Story */}
      <section className="py-16 sm:py-24">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16">
            <div>
              <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
                {copy.about.storyTitle}
              </h2>
              <div className="mt-6 space-y-5 text-base leading-8 text-muted">
                {copy.about.story.map((para) => (
                  <p key={para.slice(0, 24)}>{para}</p>
                ))}
              </div>
              <dl className="mt-10 grid grid-cols-2 gap-6 border-t border-line pt-8 sm:grid-cols-3">
                {copy.about.facts.map((fact) => (
                  <div key={fact.label}>
                    <dt className="text-xs font-semibold uppercase tracking-widest text-muted">
                      {fact.label}
                    </dt>
                    <dd className="mt-1.5 font-display text-2xl font-medium">
                      {fact.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            {storyArtwork && (
              <Reveal>
                <div className="flex items-center justify-center rounded-xl border border-line bg-surface p-8 sm:p-12">
                  <Image
                    src={storyArtwork.image.src}
                    alt={storyArtwork.alt}
                    width={storyArtwork.image.width}
                    height={storyArtwork.image.height}
                    sizes="(min-width: 1024px) 42vw, 90vw"
                    className="h-auto max-h-[24rem] w-auto max-w-full object-contain shadow-[0_18px_40px_-20px_rgba(25,21,16,0.5)]"
                    {...(storyBlur
                      ? { placeholder: "blur" as const, blurDataURL: storyBlur }
                      : {})}
                  />
                </div>
              </Reveal>
            )}
          </div>
        </Container>
      </section>

      {/* Values */}
      <section className="border-y border-line bg-surface py-16 sm:py-20">
        <Container>
          <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
            {copy.about.valuesTitle}
          </h2>
          <ul className="mt-8 grid gap-5 md:grid-cols-3">
            {copy.about.values.map((value, i) => (
              <Reveal
                as="li"
                key={value.name}
                delay={staggerDelay(i)}
                className="h-full"
              >
                <div className="h-full rounded-xl border border-line bg-background p-6">
                  <h3 className="font-display text-lg font-medium">{value.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{value.text}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </Container>
      </section>

      {/* Materials — the questions a facilities manager asks first. */}
      <section className="py-16 sm:py-24">
        <Container>
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              {copy.about.materialsEyebrow}
            </p>
            <h2 className="mt-3 font-display text-3xl font-medium tracking-tight sm:text-4xl">
              {copy.about.materialsTitle}
            </h2>
            <p className="mt-3 text-base leading-7 text-muted">
              {copy.about.materialsSubtitle}
            </p>
          </div>

          <ul className="mt-10 grid gap-5 md:grid-cols-2">
            {materials.map((material, i) => (
              <Reveal as="li" key={material.id} delay={staggerDelay(i)} className="h-full">
                <div className="flex h-full flex-col rounded-xl border border-line bg-surface p-6">
                  <h3 className="font-display text-xl font-medium">{material.name}</h3>
                  <p className="mt-1 font-mono text-xs uppercase tracking-wider text-accent">
                    {material.spec}
                  </p>
                  <p className="mt-4 flex-1 text-sm leading-7 text-muted">{material.why}</p>
                  <p className="mt-4 border-t border-line pt-4 text-xs font-semibold uppercase tracking-widest text-muted">
                    {material.bestFor}
                  </p>
                </div>
              </Reveal>
            ))}
          </ul>
        </Container>
      </section>

      {/* Case studies */}
      <section className="border-t border-line bg-surface py-16 sm:py-24">
        <Container>
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              {copy.about.caseStudiesEyebrow}
            </p>
            <h2 className="mt-3 font-display text-3xl font-medium tracking-tight sm:text-4xl">
              {copy.about.caseStudiesTitle}
            </h2>
            <p className="mt-3 text-base leading-7 text-muted">
              {copy.about.caseStudiesSubtitle}
            </p>
          </div>

          <ul className="mt-10 grid gap-5 md:grid-cols-3">
            {caseStudies.map((cs, i) => {
              const venue = getVenueById(cs.venue);
              return (
                <Reveal as="li" key={cs.slug} delay={staggerDelay(i)} className="h-full">
                  <article className="flex h-full flex-col rounded-xl border border-line bg-background p-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                      {venue?.name} · {cs.location}
                    </p>
                    <h3 className="mt-3 font-display text-xl font-medium leading-snug">
                      {cs.title}
                    </h3>
                    <p className="mt-3 flex-1 text-sm leading-6 text-muted">{cs.summary}</p>
                    <p className="mt-4 border-t border-line pt-4 text-sm font-medium leading-6">
                      {cs.outcome}
                    </p>
                    {cs.isPlaceholder && (
                      <p className="mt-4 text-xs italic leading-5 text-muted">
                        {copy.about.placeholderNote}
                      </p>
                    )}
                  </article>
                </Reveal>
              );
            })}
          </ul>
        </Container>
      </section>

      <section className="bg-ink py-16 text-background sm:py-20">
        <Container className="flex flex-wrap items-center justify-between gap-8">
          <div>
            <h2 className="max-w-xl font-display text-3xl font-medium tracking-tight sm:text-4xl">
              {copy.about.ctaTitle}
            </h2>
            <p className="mt-3 max-w-xl text-base leading-7 text-background/75">
              {copy.about.ctaSubtitle} {site.contact.address.city}.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <LinkButton href="/contact" variant="inverted">
              {copy.cta.primary}
            </LinkButton>
            <LinkButton href="/portfolio" variant="outlineInverted">
              {copy.cta.explore}
            </LinkButton>
          </div>
        </Container>
      </section>
    </>
  );
}
