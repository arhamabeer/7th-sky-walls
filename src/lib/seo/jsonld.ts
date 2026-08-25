import type {
  BreadcrumbList,
  LocalBusiness,
  VisualArtwork,
  WebSite,
  WithContext,
} from "schema-dts";
import { absoluteUrl, site } from "@/config/site.config";
import type { Artwork } from "@/lib/content/schema";
import { getSizeDimensions } from "@/lib/content";

/**
 * JSON-LD builders. Strategy (per Google's current guidance for portfolio
 * items not sold online): LocalBusiness + WebSite site-wide with stable
 * @id anchors, VisualArtwork per artwork referencing the business as
 * creator, and BreadcrumbList for hierarchy. Product markup is deliberately
 * NOT used — without offers/reviews it is ineligible for rich results.
 */

export const BUSINESS_ID = absoluteUrl("/#business");
export const WEBSITE_ID = absoluteUrl("/#website");

export function localBusinessJsonLd(): WithContext<LocalBusiness> {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": BUSINESS_ID,
    name: site.name,
    legalName: site.legalName,
    description: site.description,
    url: site.url,
    logo: absoluteUrl(site.assets.icon512),
    image: absoluteUrl(site.assets.icon512),
    email: site.contact.email,
    telephone: site.contact.phone,
    foundingDate: String(site.foundingYear),
    address: {
      "@type": "PostalAddress",
      streetAddress: site.contact.address.street,
      addressLocality: site.contact.address.city,
      addressRegion: site.contact.address.region,
      postalCode: site.contact.address.postalCode,
      addressCountry: site.contact.address.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: site.contact.geo.latitude,
      longitude: site.contact.geo.longitude,
    },
    openingHoursSpecification: site.contact.hours.map((h) => ({
      "@type": "OpeningHoursSpecification" as const,
      dayOfWeek: h.days,
      opens: h.opens,
      closes: h.closes,
    })),
    sameAs: Object.values(site.social).filter(Boolean),
  };
}

export function webSiteJsonLd(): WithContext<WebSite> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: site.name,
    url: site.url,
    publisher: { "@id": BUSINESS_ID },
  };
}

export function visualArtworkJsonLd(artwork: Artwork): WithContext<VisualArtwork> {
  const dims = getSizeDimensions(artwork.defaultSize, artwork.orientation);
  return {
    "@context": "https://schema.org",
    "@type": "VisualArtwork",
    "@id": absoluteUrl(`/portfolio/${artwork.slug}#artwork`),
    name: artwork.title,
    description: artwork.description,
    url: absoluteUrl(`/portfolio/${artwork.slug}`),
    image: {
      "@type": "ImageObject",
      contentUrl: absoluteUrl(artwork.image.src),
      creditText: site.name,
      creator: { "@id": BUSINESS_ID },
      copyrightNotice: `© ${site.name}`,
    },
    artform: "Wall art",
    artMedium: artwork.materials.join(", "),
    artworkSurface: "Canvas / fine-art paper",
    width: `${dims.widthCm} cm`,
    height: `${dims.heightCm} cm`,
    dateCreated: String(artwork.year),
    creator: { "@id": BUSINESS_ID },
    copyrightHolder: { "@id": BUSINESS_ID },
    genre: artwork.styles,
    isPartOf: { "@id": WEBSITE_ID },
  };
}

export function breadcrumbJsonLd(
  items: Array<{ name: string; path: string }>,
): WithContext<BreadcrumbList> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem" as const,
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
