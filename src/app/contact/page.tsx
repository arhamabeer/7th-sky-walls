import type { Metadata } from "next";
import { mailtoLink, site, telLink, whatsappLink } from "@/config/site.config";
import { copy } from "@/content/copy";
import { pageMetadata } from "@/lib/seo/metadata";
import { getVenues } from "@/lib/content";
import { Container } from "@/components/ui/container";
import { LinkButton } from "@/components/ui/link-button";
import { InquiryForm } from "@/components/inquiry/inquiry-form";

export const metadata: Metadata = pageMetadata({
  title: copy.contact.title,
  description: copy.contact.subtitle,
  path: "/contact",
});

export default function ContactPage() {
  const venues = getVenues().map((v) => ({ id: v.id, name: v.name }));

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

      <section className="py-12 sm:py-16">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr] lg:gap-16">
            <div>
              <h2 className="font-display text-2xl font-medium tracking-tight">
                {copy.contact.formTitle}
              </h2>
              <p className="mt-2 max-w-lg text-sm leading-6 text-muted">
                {copy.contact.formSubtitle}
              </p>
              <div className="mt-8">
                <InquiryForm
                  venues={venues}
                  whatsappMessage={copy.contact.inquiryDefaultMessage}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">
                {copy.contact.channelsTitle}
              </h2>

              <div className="rounded-xl border border-line bg-surface p-5">
                <h3 className="font-display text-lg font-medium">
                  {copy.contact.whatsappCard.title}
                </h3>
                <p className="mt-1.5 text-sm leading-6 text-muted">
                  {copy.contact.whatsappCard.text}
                </p>
                <LinkButton
                  href={whatsappLink(copy.contact.inquiryDefaultMessage)}
                  external
                  className="mt-4 w-full"
                >
                  {copy.cta.whatsapp}
                </LinkButton>
              </div>

              <div className="rounded-xl border border-line bg-surface p-5">
                <h3 className="font-display text-lg font-medium">
                  {copy.contact.emailCard.title}
                </h3>
                <p className="mt-1.5 text-sm leading-6 text-muted">
                  {copy.contact.emailCard.text}
                </p>
                <LinkButton
                  href={mailtoLink()}
                  external
                  variant="outline"
                  className="mt-4 w-full break-all"
                >
                  {site.contact.email}
                </LinkButton>
              </div>

              <div className="rounded-xl border border-line bg-surface p-5">
                <h3 className="font-display text-lg font-medium">
                  {copy.contact.phoneCard.title}
                </h3>
                <p className="mt-1.5 text-sm leading-6 text-muted">
                  {copy.contact.phoneCard.text}
                </p>
                <LinkButton
                  href={telLink()}
                  external
                  variant="outline"
                  className="mt-4 w-full"
                >
                  {site.contact.phone}
                </LinkButton>
              </div>

              <div className="rounded-xl border border-line bg-surface p-5">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">
                  {copy.contact.visitTitle}
                </h3>
                <address className="mt-2 text-sm not-italic leading-7 text-muted">
                  {site.contact.address.street}
                  <br />
                  {site.contact.address.city}, {site.contact.address.region}{" "}
                  {site.contact.address.postalCode}
                </address>
                <h3 className="mt-4 text-xs font-semibold uppercase tracking-widest text-muted">
                  {copy.contact.hoursTitle}
                </h3>
                <ul className="mt-2 text-sm leading-7 text-muted">
                  {site.contact.hours.map((h) => (
                    <li key={h.opens}>
                      {h.days[0]} – {h.days[h.days.length - 1]}: {h.opens} – {h.closes}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
