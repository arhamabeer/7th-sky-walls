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
  /**
   * How the material behaves in fire, as a property of the material.
   *
   * Required, because two pages tell the reader that fire rating is the first
   * thing a facilities manager asks and then never answered it. A raised
   * question with no answer is worse than a wrong number.
   *
   * Stated as material behaviour, never as a certified result for this studio's
   * letters: "expanded PVC is self-extinguishing" is a fact about PVC, whereas
   * "our letters are Class B certified" would be a claim needing a test
   * certificate the studio has not provided.
   */
  fire: z.string().min(20),
  /**
   * The same fire behaviour in three or four words, for a comparison table.
   *
   * A restatement of `fire`, never an addition to it. The long form is the one a
   * specifier reads; this is the one they scan across six materials before
   * deciding which paragraph to read. Required so a material cannot enter the
   * table with a blank cell in the column the table exists for.
   */
  fireShort: z.string().min(3).max(48),
  /**
   * How far the finished letter stands off the wall, in millimetres.
   *
   * Depth rather than sheet thickness, because for cut lettering they are not
   * the same number and depth is the one that matters: it is what casts the
   * shadow. Aluminium is a 3mm face on 15mm returns, so its depth is 15.
   */
  depthMm: z.number().int().positive(),
  bestFor: z.string(),
  /**
   * The venues this material is usually quoted for, as ids.
   *
   * `bestFor` already says this in prose — "Schools, universities, corridors,
   * leased offices, cafés" — but prose cannot be filtered, and the consequence
   * was that all six venue pages rendered the identical six-material block. Six
   * pages carrying the same section is thin content for search and unhelpful in
   * person: a school specifier read about gold mirror acrylic for salons.
   *
   * Used to lead with the right materials rather than to hide the others. Every
   * material stays available on every venue page, because `bestFor` is a
   * recommendation and not an exclusion — filtering on it left restaurants with
   * exactly one material, which is worse than showing all six.
   *
   * `check:slug-refs` asserts every id is a real venue and that this list does
   * not contradict the prose beside it.
   */
  venues: z.array(z.string()).min(1),
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
