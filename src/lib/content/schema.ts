import { z } from "zod";

/**
 * Content schemas — the contract every content file must satisfy.
 * Designed to be CMS-portable: each entity is flat, referenced by slug/id,
 * and validated at build time so bad content fails the build, not the page.
 */

export const VENUE_IDS = [
  "office",
  "cafe",
  "restaurant",
  "hotel",
  "school",
  "university",
] as const;
export const venueIdSchema = z.enum(VENUE_IDS);
export type VenueId = z.infer<typeof venueIdSchema>;

export const SIZE_IDS = ["s", "m", "l", "xl"] as const;
export const sizeIdSchema = z.enum(SIZE_IDS);
export type SizeId = z.infer<typeof sizeIdSchema>;

export const orientationSchema = z.enum(["portrait", "landscape", "square", "panorama"]);
export type Orientation = z.infer<typeof orientationSchema>;

export const imageSchema = z.object({
  src: z.string().startsWith("/"),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export const artworkSchema = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be kebab-case"),
  title: z.string().min(2),
  collection: z.string(),
  description: z.string().min(20),
  /** Descriptive alt text for the artwork image (SEO + a11y). */
  alt: z.string().min(10),
  venues: z.array(venueIdSchema).min(1),
  styles: z.array(z.string()).min(1),
  orientation: orientationSchema,
  /**
   * The wall this piece is specified for.
   *
   * Required, not optional. Cut lettering is specified with its wall: pale
   * letters on a pale wall are invisible, and that is a fact about the
   * installation rather than a fault in the piece. Every preview paints this
   * tone behind the artwork so what is shown is what would be installed.
   */
  wallTone: z.enum(["dark", "light", "accent"]),
  image: imageSchema,
  sizes: z.array(sizeIdSchema).min(1),
  defaultSize: sizeIdSchema,
  /** True for text-based pieces (calligraphy/quotes) that support the
   *  custom text/typography configurator (Phase 6). */
  customText: z.boolean().default(false),
  materials: z.array(z.string()).min(1),
  year: z.number().int().min(2015),
  featured: z.boolean().default(false),
  /** AR assets, populated by the Phase 3 generation pipeline. */
  ar: z
    .object({
      glb: z.string().startsWith("/").optional(),
      usdz: z.string().startsWith("/").optional(),
    })
    .optional(),
});
export type Artwork = z.infer<typeof artworkSchema>;

export const collectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** One or two sentences, used on cards and as the meta description. */
  description: z.string(),
  /** Short editorial line for the collection page hero. */
  tagline: z.string(),
  /** Long-form editorial copy for the collection page. */
  story: z.string().min(80),
  /** Which spaces the series suits, in the studio's own words. */
  bestFor: z.string(),
});
export type Collection = z.infer<typeof collectionSchema>;

export const serviceSchema = z.object({
  slug: z.string(),
  name: z.string(),
  summary: z.string(),
  description: z.string(),
  deliverables: z.array(z.string()).min(2),
  idealFor: z.array(venueIdSchema).min(1),
  /** Artwork slug used as the visual for this service. */
  featureArtwork: z.string(),
  /** What a client actually gets back, and when. Builds trust before price. */
  leadTime: z.string(),
});
export type Service = z.infer<typeof serviceSchema>;

export const materialSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** Technical specification, stated plainly. */
  spec: z.string(),
  /** Why this material rather than another — the reasoning, not the sales pitch. */
  why: z.string().min(40),
  bestFor: z.string(),
});
export type Material = z.infer<typeof materialSchema>;

export const caseStudySchema = z.object({
  slug: z.string(),
  title: z.string(),
  venue: venueIdSchema,
  location: z.string(),
  summary: z.string(),
  outcome: z.string(),
  /** Placeholder case studies are visually marked until real projects land. */
  isPlaceholder: z.boolean().default(false),
});
export type CaseStudy = z.infer<typeof caseStudySchema>;

export const venueSchema = z.object({
  id: venueIdSchema,
  name: z.string(),
  /** Short pitch shown on venue cards and filters. */
  pitch: z.string(),
  /** Page headline for the venue's own landing page. */
  headline: z.string(),
  /** Opening paragraph — why art in this kind of space is its own problem. */
  intro: z.string().min(80),
  /**
   * What actually differs about specifying art here. This is the content a
   * commercial buyer cannot get anywhere else, and the reason these pages
   * exist rather than being filter links.
   */
  considerations: z
    .array(z.object({ title: z.string(), text: z.string().min(40) }))
    .min(2),
  /** Room scene used for the scale preview on this page. */
  scene: z.string(),
});
export type VenueInfo = z.infer<typeof venueSchema>;

export interface SizeTier {
  id: SizeId;
  label: string;
  /** Long edge in centimetres for standard orientations. */
  longEdgeCm: number;
  /** Long edge for panoramic pieces, which need a larger scale to read. */
  panoramaLongEdgeCm: number;
}
