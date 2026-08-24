import type { Metadata } from "next";
import { copy } from "@/content/copy";
import { pageMetadata } from "@/lib/seo/metadata";
import { getCaseStudies, getVenueById } from "@/lib/content";
import { Container } from "@/components/ui/container";
import { LinkButton } from "@/components/ui/link-button";
import { SectionHeading } from "@/components/ui/section-heading";

export const metadata: Metadata = pageMetadata({
  title: copy.about.title,
  description: copy.about.subtitle,
  path: "/about",
});

export default function AboutPage() {
  const caseStudies = getCaseStudies();

  return (
    <>
      <section className="border-b border-line py-14 sm:py-20">
        <Container>
          <h1 className="font-display text-4xl font-medium tracking-tight sm:text-5xl">
            {copy.about.title}
          </h1>
          <p className="mt-3 max-w-xl text-base leading-7 text-muted">{copy.about.subtitle}</p>
        </Container>
      </section>

      <section className="py-14 sm:py-20">
        <Container className="grid gap-10 md:grid-cols-[1fr_1.4fr]">
          <SectionHeading title={copy.about.storyTitle} />
          <div className="space-y-5 text-base leading-8 text-muted">
            {copy.about.story.map((para) => (
              <p key={para.slice(0, 24)}>{para}</p>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-y border-line bg-surface py-14 sm:py-20">
        <Container>
          <SectionHeading title={copy.about.valuesTitle} />
          <ul className="mt-8 grid gap-5 md:grid-cols-3">
            {copy.about.values.map((value) => (
              <li key={value.name} className="rounded-xl border border-line bg-background p-6">
                <h3 className="font-display text-lg font-medium">{value.name}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{value.text}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section className="py-14 sm:py-20">
        <Container>
          <SectionHeading
            title={copy.about.caseStudiesTitle}
            subtitle={copy.about.caseStudiesSubtitle}
          />
          <ul className="mt-8 grid gap-5 md:grid-cols-3">
            {caseStudies.map((cs) => {
              const venue = getVenueById(cs.venue);
              return (
                <li key={cs.slug} className="flex flex-col rounded-xl border border-line bg-surface p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                    {venue?.name} · {cs.location}
                  </p>
                  <h3 className="mt-3 font-display text-xl font-medium leading-snug">
                    {cs.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-muted">{cs.summary}</p>
                  <p className="mt-4 border-t border-line pt-4 text-sm font-medium leading-6">
                    {cs.outcome}
                  </p>
                  {cs.isPlaceholder && (
                    <p className="mt-4 text-xs italic text-muted">
                      Illustrative example — real project stories coming soon.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="mt-12">
            <LinkButton href="/contact">{copy.cta.primary}</LinkButton>
          </div>
        </Container>
      </section>
    </>
  );
}
