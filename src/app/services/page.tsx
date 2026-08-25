import type { Metadata } from "next";
import { whatsappLink } from "@/config/site.config";
import { copy, serviceInquiryMessage } from "@/content/copy";
import { pageMetadata } from "@/lib/seo/metadata";
import { getServices, getVenueById } from "@/lib/content";
import { Container } from "@/components/ui/container";
import { LinkButton } from "@/components/ui/link-button";
import { SectionHeading } from "@/components/ui/section-heading";
import { Chip } from "@/components/ui/chip";

export const metadata: Metadata = pageMetadata({
  title: copy.services.title,
  description: copy.services.subtitle,
  path: "/services",
});

export default function ServicesPage() {
  const services = getServices();

  return (
    <>
      <section className="border-b border-line py-14 sm:py-20">
        <Container>
          <h1 className="font-display text-4xl font-medium tracking-tight sm:text-5xl">
            {copy.services.title}
          </h1>
          <p className="mt-3 max-w-xl text-base leading-7 text-muted">
            {copy.services.subtitle}
          </p>
        </Container>
      </section>

      <section className="py-14 sm:py-20">
        <Container className="space-y-16">
          {services.map((service, i) => (
            <article
              key={service.slug}
              id={service.slug}
              className="grid gap-8 border-b border-line pb-16 last:border-b-0 last:pb-0 md:grid-cols-[1.2fr_1fr]"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h2 className="mt-3 font-display text-2xl font-medium tracking-tight sm:text-3xl">
                  {service.name}
                </h2>
                <p className="mt-3 text-base leading-7 text-muted">{service.description}</p>
                <ul className="mt-5 flex flex-wrap gap-2">
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
              </div>
              <div className="rounded-xl border border-line bg-surface p-6">
                <h3 className="text-sm font-semibold uppercase tracking-widest text-muted">
                  What you get
                </h3>
                <ul className="mt-4 space-y-3">
                  {service.deliverables.map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-6">
                      <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      {item}
                    </li>
                  ))}
                </ul>
                <LinkButton
                  href={whatsappLink(serviceInquiryMessage(service.name))}
                  external
                  variant="outline"
                  className="mt-6 w-full"
                >
                  {copy.cta.whatsapp}
                </LinkButton>
              </div>
            </article>
          ))}
        </Container>
      </section>

      <section className="border-t border-line bg-surface py-16 sm:py-24">
        <Container>
          <SectionHeading title={copy.services.processTitle} align="center" />
          <ol className="mx-auto mt-10 grid max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {copy.services.process.map((step, i) => (
              <li key={step.step} className="rounded-xl border border-line bg-background p-5">
                <p className="font-display text-3xl font-medium text-accent-soft">{i + 1}</p>
                <h3 className="mt-2 font-display text-lg font-medium">{step.step}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{step.text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-12 text-center">
            <LinkButton href="/contact">{copy.cta.primary}</LinkButton>
          </div>
        </Container>
      </section>
    </>
  );
}
