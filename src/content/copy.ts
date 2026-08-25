import { site } from "@/config/site.config";

/**
 * All user-facing UI copy, centralized. Brand-identifying strings are
 * interpolated from site.config so a rename never touches this file's
 * structure — and a future i18n phase can swap this module per locale.
 */
export const copy = {
  nav: {
    home: "Home",
    portfolio: "Portfolio",
    services: "Services",
    about: "About",
    contact: "Contact",
  },
  cta: {
    primary: "Start an inquiry",
    explore: "Explore the portfolio",
    viewArtwork: "View artwork",
    inquireArtwork: "Inquire about this piece",
    whatsapp: "Chat on WhatsApp",
    email: "Email us",
    call: "Call us",
    allServices: "See all services",
    viewAll: "View all",
  },
  home: {
    heroEyebrow: "Wall art · Murals · Calligraphy",
    heroTitle: "Your walls have been waiting.",
    heroSubtitle: `${site.name} designs, produces and installs immersive wall art for offices, cafés, hotels, restaurants and campuses.`,
    collectionsEyebrow: "The catalog",
    collectionsTitle: "Collections",
    collectionsSubtitle: "Six curated series, each built for a different mood and space.",
    featuredTitle: "Featured works",
    featuredSubtitle: "A first look at pieces our clients build rooms around.",
    venuesEyebrow: "Venue verticals",
    venuesTitle: "Designed for every space",
    venuesSubtitle: "Browse the portfolio by the space you're transforming.",
    previewEyebrow: "Before you commit",
    previewTitle: "See it on your wall, at its real size",
    previewSubtitle:
      "Getting the size wrong is the expensive mistake with large-format art. So we made it impossible to guess: every piece can be checked against furniture you already know, and placed on your own wall through your phone's camera.",
    previewSteps: [
      {
        title: "Pick a size",
        text: "Four standard sizes per piece, all in the same proportions — nothing is cropped to fit.",
      },
      {
        title: "Check it against a room you recognise",
        text: "An office reception, a café, a classroom, a lobby — each with real furniture heights as the reference.",
      },
      {
        title: "Then put it on your actual wall",
        text: "Point your phone at the wall and the piece appears at true size. It cannot be resized, so what you see is what arrives.",
      },
    ],
    previewCta: "Try it on a piece",
    ctaTitle: "Have a wall in mind?",
    ctaSubtitle: "Tell us about your space — we'll respond with ideas within one working day.",
  },
  collections: {
    title: "Collections",
    subtitle:
      "Six curated series, each built for a different mood and a different kind of space.",
    viewCollection: "View the series",
    bestForTitle: "Best suited to",
    ctaTitle: "Want this series in your space?",
    ctaSubtitle:
      "Tell us the room and the wall — we'll suggest a selection and sizes, and mock it up before anything is produced.",
  },
  portfolio: {
    title: "Portfolio",
    subtitle: "Every piece is produced to order in your choice of size and finish.",
    filterAllLabel: "All spaces",
    emptyState: "No artworks match this filter yet — try another space.",
    breadcrumbRoot: "Portfolio",
  },
  artwork: {
    sizesTitle: "Available sizes",
    sizesNote: "All artworks are produced to order. Custom dimensions available on request.",
    materialsTitle: "Materials & finish",
    venuesTitle: "Recommended for",
    customizableBadge: "Customizable text",
    customizableNote: "This piece can be personalized — your own words, typography and colors.",
    moreFromCollection: "More from this collection",
  },
  services: {
    title: "Services",
    subtitle: "From a single statement piece to a full building's art program — one team, end to end.",
    processTitle: "How we work",
    process: [
      { step: "Consult", text: "We visit or video-call, measure your walls and understand the mood you're after." },
      { step: "Design", text: "You receive digital mockups of the art in your actual space before anything is produced." },
      { step: "Produce", text: "Printed and finished in-house on archival materials, built for commercial durability." },
      { step: "Install", text: "Our team delivers and installs — leveled, secured and spotless." },
    ],
  },
  about: {
    title: "About",
    subtitle: "We believe a wall is the largest canvas a business owns.",
    storyTitle: "Why we exist",
    story: [
      "Most commercial spaces treat walls as an afterthought — a coat of paint and a clock. We started this studio because we kept walking into offices, cafés and campuses that felt unfinished, and we knew exactly what was missing.",
      "Today we design, produce and install wall art as one continuous craft: original artwork, precise large-format production, and installation that respects your space and your schedule.",
    ],
    valuesTitle: "What we stand for",
    values: [
      { name: "True to scale", text: "Art sized for the wall it lives on — measured, mocked up and verified before production." },
      { name: "Built for commercial life", text: "Materials chosen for lobbies, classrooms and dining rooms — durable, cleanable, fade-resistant." },
      { name: "End to end", text: "One accountable team from first sketch to final screw." },
    ],
    caseStudiesTitle: "Recent projects",
    caseStudiesSubtitle: "A few of the spaces we've transformed.",
  },
  contact: {
    title: "Contact",
    subtitle: "Tell us about your space. We reply within one working day.",
    formTitle: "Tell us about your wall",
    formSubtitle:
      "The more you can share about the space, the more useful our first reply will be — we'd rather send ideas than questions.",
    formSubtitleArtwork:
      "Tell us where it's going and we'll come back with sizes, finishes and a mockup on a photo of your wall.",
    channelsTitle: "Reach us directly",
    whatsappCard: { title: "WhatsApp", text: "Fastest response — send us a photo of your wall." },
    emailCard: { title: "Email", text: "Best for detailed briefs and documents." },
    phoneCard: { title: "Phone", text: "Talk to us directly during studio hours." },
    visitTitle: "Studio",
    hoursTitle: "Hours",
    inquiryDefaultMessage: `Hello ${site.name} — I'd like to discuss wall art for my space.`,
  },
  footer: {
    blurb: `${site.name} is a wall art studio serving commercial spaces — offices, cafés, hotels, restaurants, schools and universities.`,
    rights: "All rights reserved.",
  },
  a11y: {
    skipToContent: "Skip to content",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    mainNav: "Main navigation",
    footerNav: "Footer navigation",
    breadcrumb: "Breadcrumb",
  },
} as const;

/** Prefilled WhatsApp message for a specific artwork inquiry. */
export function artworkInquiryMessage(artworkTitle: string): string {
  return `Hello ${site.name} — I'm interested in "${artworkTitle}". Could you share options and pricing for my space?`;
}

/** Prefilled WhatsApp message for a specific service inquiry. */
export function serviceInquiryMessage(serviceName: string): string {
  return `Hello ${site.name} — I'd like to discuss ${serviceName} for my space.`;
}
