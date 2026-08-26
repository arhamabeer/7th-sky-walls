import type { Metadata } from "next";
import Link from "next/link";
import { copy } from "@/content/copy";
import { pageMetadata } from "@/lib/seo/metadata";
import { getMaterials } from "@/lib/content";
import { MOUNTS } from "@/content/finishes";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { JsonLd } from "@/components/seo/jsonld-script";
import { MaterialComparisonTable } from "@/components/materials/comparison-table";
import { Container } from "@/components/ui/container";
import { LinkButton } from "@/components/ui/link-button";
import { Reveal } from "@/components/motion/reveal";
import { staggerDelay } from "@/components/motion/stagger";

export const metadata: Metadata = pageMetadata({
  title: copy.materials.title,
  description: copy.materials.subtitle,
  path: "/materials",
});

/**
 * The specification page.
 *
 * Its own route rather than a section on About. Two other pages tell the reader
 * that fire rating is the first thing a facilities manager asks, and the answer
 * had been living halfway down a studio biography — which is not something a
 * specifier can forward to a procurement officer. The venue pages now point here
 * instead.
 *
 * The table earns its place by being scannable across six materials; the cards
 * below it carry the reasoning. Both are built from the same records, so a
 * material cannot appear in one and not the other.
 */
export default function MaterialsPage() {
  const materials = getMaterials();
  const t = copy.materials;

  const breadcrumbs = [
    { name: copy.nav.home, path: "/" },
    { name: t.title, path: "/materials" },
  ];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(breadcrumbs)} />

      <section className="border-b border-line py-16 sm:py-24">
        <Container>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            {t.eyebrow}
          </p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-medium leading-[1.06] tracking-tight sm:text-5xl">
            {t.title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-muted">{t.subtitle}</p>
        </Container>
      </section>

      <section className="border-b border-line py-14 sm:py-20">
        <Container>
          <h2 className="font-display text-2xl font-medium tracking-tight">
            {t.tableTitle}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">{t.tableNote}</p>

          <div className="mt-6">
            <MaterialComparisonTable materials={materials} linkRows="anchor" />
          </div>

          <div className="mt-8 max-w-2xl rounded-xl border border-line bg-surface p-6">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-accent">
              {t.ratingCaveatTitle}
            </h3>
            <p className="mt-2 text-sm leading-7 text-muted">{t.ratingCaveat}</p>
          </div>
        </Container>
      </section>

      <section className="border-b border-line py-14 sm:py-20">
        <Container>
          <h2 className="font-display text-2xl font-medium tracking-tight">
            {t.detailTitle}
          </h2>
          <ul className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {materials.map((material, i) => (
              <Reveal as="li" key={material.id} delay={staggerDelay(i)} className="h-full">
                {/* The id sits on the card rather than on Reveal, whose surface
                    is deliberately just children/delay/as/className. scroll-mt
                    clears the sticky header when the table links here. */}
                <div
                  id={material.id}
                  className="flex h-full scroll-mt-24 flex-col rounded-xl border border-line bg-surface p-6"
                >
                  <h3 className="font-display text-xl font-medium">{material.name}</h3>
                  <p className="mt-1 font-mono text-xs uppercase tracking-wider text-accent">
                    {material.spec}
                  </p>
                  <p className="mt-4 text-sm leading-7 text-muted">{material.why}</p>
                  <div className="mt-4 flex-1 rounded-lg border border-line bg-background p-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-accent">
                      {t.fireLabel}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted">{material.fire}</p>
                  </div>
                  <p className="mt-4 border-t border-line pt-4 text-xs font-semibold uppercase tracking-widest text-muted">
                    {material.bestFor}
                  </p>
                </div>
              </Reveal>
            ))}
          </ul>
        </Container>
      </section>

      <section className="border-b border-line bg-surface py-14 sm:py-20">
        <Container>
          <h2 className="font-display text-2xl font-medium tracking-tight">
            {t.mountingTitle}
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-8 text-muted">
            {t.mountingSubtitle}
          </p>
          <ul className="mt-8 grid gap-6 sm:grid-cols-2">
            {MOUNTS.map((mount, i) => (
              <Reveal as="li" key={mount.id} delay={staggerDelay(i)} className="h-full">
                <div className="flex h-full flex-col rounded-xl border border-line bg-background p-6">
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="font-display text-lg font-medium">{mount.name}</h3>
                    <p className="shrink-0 font-mono text-xs uppercase tracking-wider text-accent">
                      {mount.standoffMm > 0
                        ? `${t.standoffLabel} ${mount.standoffMm} mm`
                        : t.flushLabel}
                    </p>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-muted">{mount.description}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </Container>
      </section>

      <section className="py-14 sm:py-20">
        <Container>
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">
              {t.ctaTitle}
            </h2>
            <p className="mt-3 text-base leading-8 text-muted">{t.ctaSubtitle}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <LinkButton href="/contact">{copy.cta.primary}</LinkButton>
              <LinkButton href="/portfolio" variant="outline">
                {copy.cta.explore}
              </LinkButton>
            </div>
            <p className="mt-6 text-sm text-muted">
              <Link
                href="/spaces"
                className="inline-flex min-h-11 items-center font-semibold text-accent underline-offset-4 hover:underline"
              >
                {copy.spaces.title}
              </Link>{" "}
              — what changes about specifying art in each kind of space.
            </p>
          </div>
        </Container>
      </section>
    </>
  );
}
