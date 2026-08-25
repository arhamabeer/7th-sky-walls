/**
 * Central brand & business configuration — the single source of truth.
 *
 * Every brand-identifying value (name, tagline, colors, contact details,
 * social links, domain) lives HERE and only here. Renaming the brand or
 * changing its identity must never require edits anywhere else in the
 * codebase: components, metadata, JSON-LD, manifest, sitemap and UI copy
 * all read from this object.
 *
 * Values marked TODO are placeholders awaiting real business details.
 */
export const site = {
  /** Public brand name (working title — subject to change). */
  name: "7th Sky Walls",
  /** Registered legal entity name, used in JSON-LD. TODO: confirm. */
  legalName: "7th Sky Walls",
  /** One-line brand promise, used in metadata and the OG image. */
  tagline: "Immersive wall art for spaces that inspire",
  /** Default meta description (~155 chars). */
  description:
    "Bespoke wall art, murals and calligraphy for offices, cafes, hotels, restaurants and campuses — designed, produced and installed end to end.",
  /** Canonical production origin. TODO: replace with the purchased domain. */
  url: "https://7th-sky-walls.vercel.app",
  locale: "en",
  /** Founding year shown in copy and JSON-LD. TODO: confirm. */
  foundingYear: 2024,

  /** Brand asset paths (files under /public). Swap files to rebrand. */
  assets: {
    /** Abstract logo mark (SVG, no brand text baked in). */
    mark: "/brand/mark.svg",
    /** PWA / touch icons generated from the mark. */
    icon192: "/brand/icon-192.png",
    icon512: "/brand/icon-512.png",
  },

  /**
   * Brand palette. Injected as CSS custom properties on <html> by the root
   * layout and consumed by Tailwind via @theme inline (see globals.css).
   */
  colors: {
    /** Warm gallery ivory — page background. */
    background: "#FAF7F1",
    /** Elevated surface (cards). */
    surface: "#FFFFFF",
    /** Warm near-black ink — primary text. */
    ink: "#191510",
    /** Secondary text. */
    muted: "#6F675A",
    /** Hairlines and borders. */
    line: "#E7DFD1",
    /** Deep brass — accents, meets AA on ivory for small text. */
    accent: "#8F6830",
    /**
     * Soft brass — decorative fills and selection highlight only. It does not
     * reach 3:1 against the page background, so it must never carry text at
     * any size; use `accent` for that.
     */
    accentSoft: "#C8A971",
    /** Dusk blue — secondary accent. */
    sky: "#33506B",
  },

  contact: {
    /** TODO: real inquiry inbox. */
    email: "hello@example.com",
    /** Display format. TODO: real number. */
    phone: "+92 300 0000000",
    /** WhatsApp number, digits only with country code. TODO: real number. */
    whatsapp: "923000000000",
    /** TODO: real address (also feeds LocalBusiness JSON-LD). */
    address: {
      street: "Street address pending",
      city: "Karachi",
      region: "Sindh",
      postalCode: "74000",
      country: "PK",
    },
    /** TODO: real coordinates for LocalBusiness geo. */
    geo: { latitude: 24.8607, longitude: 67.0011 },
    /** Opening hours, schema.org format. */
    hours: [{ days: ["Monday", "Saturday"], opens: "10:00", closes: "19:00" }],
  },

  /** Social profiles. Empty string = not shown anywhere. TODO: real URLs. */
  social: {
    instagram: "https://instagram.com/example",
    facebook: "",
    linkedin: "",
  },

  analytics: {
    /** GA4 measurement id, e.g. "G-XXXXXXX". Empty = GA4 not loaded. */
    gaMeasurementId: "",
  },
} as const;

export type SiteConfig = typeof site;

/** WhatsApp click-to-chat link with an optional prefilled message. */
export function whatsappLink(message?: string): string {
  const base = `https://wa.me/${site.contact.whatsapp}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function telLink(): string {
  return `tel:${site.contact.phone.replace(/[^+\d]/g, "")}`;
}

export function mailtoLink(subject?: string): string {
  const base = `mailto:${site.contact.email}`;
  return subject ? `${base}?subject=${encodeURIComponent(subject)}` : base;
}

/** Absolute URL for a site path, for canonicals/OG/JSON-LD. */
export function absoluteUrl(path = "/"): string {
  return new URL(path, site.url).toString();
}
