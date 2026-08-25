import type { Metadata } from "next";
import { mailtoLink, site, telLink, whatsappLink } from "@/config/site.config";
import { copy } from "@/content/copy";
import { pageMetadata } from "@/lib/seo/metadata";
import { Container } from "@/components/ui/container";
import { LinkButton } from "@/components/ui/link-button";

export const metadata: Metadata = pageMetadata({
  title: copy.contact.title,
  description: copy.contact.subtitle,
  path: "/contact",
});

export default function ContactPage() {
  return (
    <>
      <section className="border-b border-line py-14 sm:py-20">
        <Container>
          <h1 className="font-display text-4xl font-medium tracking-tight sm:text-5xl">
            {copy.contact.title}
          </h1>
          <p className="mt-3 max-w-xl text-base leading-7 text-muted">
            {copy.contact.subtitle}
          </p>
        </Container>
      </section>

      <section className="py-14 sm:py-20">
        <Container>
          <h2 className="sr-only">{copy.contact.channelsTitle}</h2>
          <ul className="grid gap-5 md:grid-cols-3">
            <li className="flex flex-col rounded-xl border border-line bg-surface p-6">
              <h3 className="font-display text-xl font-medium">
                {copy.contact.whatsappCard.title}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-muted">
                {copy.contact.whatsappCard.text}
              </p>
              <LinkButton
                href={whatsappLink(copy.contact.inquiryDefaultMessage)}
                external
                className="mt-5"
              >
                {copy.cta.whatsapp}
              </LinkButton>
            </li>
            <li className="flex flex-col rounded-xl border border-line bg-surface p-6">
              <h3 className="font-display text-xl font-medium">
                {copy.contact.emailCard.title}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-muted">
                {copy.contact.emailCard.text}
              </p>
              <LinkButton href={mailtoLink()} external variant="outline" className="mt-5">
                {site.contact.email}
              </LinkButton>
            </li>
            <li className="flex flex-col rounded-xl border border-line bg-surface p-6">
              <h3 className="font-display text-xl font-medium">
                {copy.contact.phoneCard.title}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-muted">
                {copy.contact.phoneCard.text}
              </p>
              <LinkButton href={telLink()} external variant="outline" className="mt-5">
                {site.contact.phone}
              </LinkButton>
            </li>
          </ul>

          <div className="mt-12 grid gap-8 rounded-xl border border-line bg-surface p-6 sm:grid-cols-2 sm:p-8">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted">
                {copy.contact.visitTitle}
              </h2>
              <address className="mt-3 text-sm not-italic leading-7 text-muted">
                {site.contact.address.street}
                <br />
                {site.contact.address.city}, {site.contact.address.region}{" "}
                {site.contact.address.postalCode}
              </address>
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted">
                {copy.contact.hoursTitle}
              </h2>
              <ul className="mt-3 text-sm leading-7 text-muted">
                {site.contact.hours.map((h) => (
                  <li key={h.opens}>
                    {h.days[0]} – {h.days[h.days.length - 1]}: {h.opens} – {h.closes}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
