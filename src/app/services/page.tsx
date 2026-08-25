import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { whatsappLink } from "@/config/site.config";
import { copy, serviceInquiryMessage } from "@/content/copy";
import { pageMetadata } from "@/lib/seo/metadata";
import {
  getArtworkBySlug,
  getBlurDataURL,
  getServices,
  getVenueById,
} from "@/lib/content";
import { Container } from "@/components/ui/container";
import { LinkButton } from "@/components/ui/link-button";
import { Chip } from "@/components/ui/chip";
import { Reveal } from "@/components/motion/reveal";
import { staggerDelay } from "@/components/motion/stagger";
import { cn } from "@/lib/utils";

export const metadata: Metadata = pageMetadata({
  title: copy.services.title,
  description: copy.services.subtitle,
  path: "/services",
});

export default function ServicesPage() {
  const services = getServices();

  return (
    <>
      <section className="border-b border-line py-16 sm:py-24">
        <Container>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            {copy.services.eyebrow}
          </p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-medium leading-[1.06] tracking-tight sm:text-6xl">
            {copy.services.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-muted sm:text-lg">
            {copy.services.subtitle}
          </p>

          <ul className="mt-10 flex flex-wrap gap-2">
            {services.map((service) => (
              <li key={service.slug}>
                <Chip href={`#${service.slug}`}>{service.name}</Chip>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* Services, alternating so the eye keeps moving down the page. */}
      {services.map((service, i) => {
        const artwork = getArtworkBySlug(service.featureArtwork);
        const blur = artwork ? getBlurDataURL(artwork.slug) : undefined;
        const flipped = i % 2 === 1;

        return (
          <section
            key={service.slug}
            id={service.slug}
            className={cn(
              "scroll-mt-24 border-b border-line py-16 sm:py-24",
              flipped && "bg-surface",
            )}
          >
            <Container>
              <div
                className={cn(
                  "grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16",
                  flipped && "lg:[&>*:first-child]:order-2",
                )}
              >
                <div>
                  <p className="font-display text-5xl font-medium leading-none text-accent">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <h2 className="mt-4 font-display text-3xl font-medium tracking-tight sm:text-4xl">
                    {service.name}
                  </h2>
                  <p className="mt-3 font-display text-lg italic text-muted">
                    {service.summary}
                  </p>
                  <p className="mt-5 text-base leading-8 text-muted">
                    {service.description}
                  </p>

                  <h3 className="mt-8 text-xs font-semibold uppercase tracking-widest text-muted">
                    {copy.services.deliverablesTitle}
                  </h3>
                  <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
                    {service.deliverables.map((item) => (
                      <li key={item} className="flex gap-3 text-sm leading-6">
                        <span
                          aria-hidden
                          className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>

                  <p className="mt-6 rounded-lg border border-line bg-background p-4 text-sm leading-6">
                    <span className="font-semibold">{copy.services.leadTimeLabel}:</span>{" "}
                    {service.leadTime}
                  </p>

                  <h3 className="mt-8 text-xs font-semibold uppercase tracking-widest text-muted">
                    {copy.services.idealForTitle}
                  </h3>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {service.idealFor.map((venueId) => {
                      const venue = getVenueById(venueId);
                      if (!venue) return null;
                      return (
                        <li key={venueId}>
                          <Chip href={`/portfolio?venue=${venueId}`}>{venue.name}</Chip>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <LinkButton href="/contact">{copy.cta.primary}</LinkButton>
                    <LinkButton
                      href={whatsappLink(serviceInquiryMessage(service.name))}
                      external
                      variant="outline"
                    >
                      {copy.cta.whatsapp}
                    </LinkButton>
                  </div>
                </div>

                {artwork && (
                  <Reveal>
                    <Link
                      href={`/portfolio/${artwork.slug}`}
                      className="group block"
                      aria-label={`${artwork.title}, an example of ${service.name}`}
                    >
                      <div
                        className={cn(
                          "flex items-center justify-center overflow-hidden rounded-xl border border-line p-8 transition-colors group-hover:border-ink/30 sm:p-12",
                          flipped ? "bg-background" : "bg-surface",
                        )}
                      >
                        <Image
                          src={artwork.image.src}
                          alt={artwork.alt}
                          width={artwork.image.width}
                          height={artwork.image.height}
                          sizes="(min-width: 1024px) 45vw, 90vw"
                          className="h-auto max-h-[26rem] w-auto max-w-full object-contain shadow-[0_18px_40px_-20px_rgba(25,21,16,0.5)] transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:group-hover:scale-100"
                          {...(blur ? { placeholder: "blur" as const, blurDataURL: blur } : {})}
                        />
                      </div>
                      <p className="mt-3 text-sm text-muted">
                        {copy.services.exampleLabel}{" "}
                        <span className="font-medium text-ink group-hover:underline">
                          {artwork.title}
                        </span>
                      </p>
                    </Link>
                  </Reveal>
                )}
              </div>
            </Container>
          </section>
        );
      })}

      {/* Process */}
      <section className="py-16 sm:py-24">
        <Container>
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              {copy.services.processEyebrow}
            </p>
            <h2 className="mt-3 font-display text-3xl font-medium tracking-tight sm:text-4xl">
              {copy.services.processTitle}
            </h2>
            <p className="mt-3 text-base leading-7 text-muted">
              {copy.services.processSubtitle}
            </p>
          </div>

          <ol className="mt-12 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {copy.services.process.map((step, i) => (
              <Reveal
                as="li"
                key={step.step}
                delay={staggerDelay(i)}
                className="flex flex-col bg-background p-6"
              >
                <p className="font-display text-4xl font-medium leading-none text-accent">
                  {i + 1}
                </p>
                <h3 className="mt-4 font-display text-lg font-medium">{step.step}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{step.text}</p>
              </Reveal>
            ))}
          </ol>
        </Container>
      </section>

      <section className="border-t border-line bg-ink py-16 text-background sm:py-20">
        <Container className="flex flex-wrap items-center justify-between gap-8">
          <div>
            <h2 className="max-w-xl font-display text-3xl font-medium tracking-tight sm:text-4xl">
              {copy.services.ctaTitle}
            </h2>
            <p className="mt-3 max-w-xl text-base leading-7 text-background/75">
              {copy.services.ctaSubtitle}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <LinkButton href="/contact" variant="inverted">
              {copy.cta.primary}
            </LinkButton>
            <LinkButton
              href={whatsappLink(copy.contact.inquiryDefaultMessage)}
              external
              variant="outlineInverted"
            >
              {copy.cta.whatsapp}
            </LinkButton>
          </div>
        </Container>
      </section>
    </>
  );
}
