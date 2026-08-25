import Link from "next/link";
import type { Artwork } from "@/lib/content/schema";
import { getBlurDataURL, getSizeDimensions } from "@/lib/content";
import { RoomScalePreview } from "@/components/artwork/room-scale-preview";
import { Container } from "@/components/ui/container";
import { LinkButton } from "@/components/ui/link-button";
import { Reveal } from "@/components/motion/reveal";
import { staggerDelay } from "@/components/motion/stagger";

/**
 * Explains the wall preview and AR try-on by showing the real thing.
 *
 * The middle panel is the same component the artwork pages use, rendering a
 * real piece at a real size against real furniture heights — not a mockup of
 * the feature. Scale anxiety is the biggest blocker on large-format art, so
 * the most persuasive thing available is to demonstrate the answer rather than
 * promise it.
 */
export function WallPreviewShowcase({
  artwork,
  steps,
  title,
  eyebrow,
  subtitle,
  ctaLabel,
}: {
  artwork: Artwork;
  steps: ReadonlyArray<{ readonly title: string; readonly text: string }>;
  title: string;
  eyebrow: string;
  subtitle: string;
  ctaLabel: string;
}) {
  const size = getSizeDimensions(artwork.defaultSize, artwork.orientation);

  return (
    <section className="border-y border-line bg-[color-mix(in_srgb,var(--brand-line)_22%,white)] py-20 sm:py-28">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              {eyebrow}
            </p>
            <h2 className="mt-3 font-display text-3xl font-medium tracking-tight sm:text-4xl">
              {title}
            </h2>
            <p className="mt-4 max-w-lg text-base leading-7 text-muted">{subtitle}</p>

            <ol className="mt-8 space-y-5">
              {steps.map((step, i) => (
                <Reveal as="li" key={step.title} delay={staggerDelay(i)} className="flex gap-4">
                  <span
                    aria-hidden
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-accent/40 text-sm font-semibold text-accent"
                  >
                    {i + 1}
                  </span>
                  <span>
                    <span className="block font-display text-lg font-medium">
                      {step.title}
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-muted">
                      {step.text}
                    </span>
                  </span>
                </Reveal>
              ))}
            </ol>

            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href={`/portfolio/${artwork.slug}`}>{ctaLabel}</LinkButton>
              {/* The planner answers the same question for more than one
                  piece, so it belongs beside this rather than buried. */}
              <LinkButton href="/planner" variant="outline">
                Plan a whole wall
              </LinkButton>
            </div>
          </div>

          <div>
            <RoomScalePreview
              imageSrc={artwork.image.src}
              imageAlt={artwork.alt}
              widthCm={size.widthCm}
              heightCm={size.heightCm}
              sceneId="office"
              blurDataURL={getBlurDataURL(artwork.slug)}
            />
            <p className="mt-3 text-sm text-muted">
              Above:{" "}
              <Link
                href={`/portfolio/${artwork.slug}`}
                className="inline-flex min-h-11 items-center font-medium text-ink underline-offset-4 hover:underline"
              >
                {artwork.title}
              </Link>{" "}
              at {size.widthCm} × {size.heightCm} cm, shown in an office reception.
              Every artwork page lets you change the size and the room.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
