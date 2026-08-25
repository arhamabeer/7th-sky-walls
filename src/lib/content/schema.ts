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

export const SIZE_IDS = ["s", "m", "l", "xl", "square", "panorama"] as const;
export const sizeIdSchema = z.enum(SIZE_IDS);
export type SizeId = z.infer<typeof sizeIdSchema>;

export const orientationSchema = z.enum(["portrait", "landscape", "square"]);
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
  description: z.string(),
});
export type Collection = z.infer<typeof collectionSchema>;

export const serviceSchema = z.object({
  slug: z.string(),
  name: z.string(),
  summary: z.string(),
  description: z.string(),
  deliverables: z.array(z.string()).min(2),
  idealFor: z.array(venueIdSchema).min(1),
});
export type Service = z.infer<typeof serviceSchema>;

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

export interface VenueInfo {
  id: VenueId;
  name: string;
  /** Short pitch shown on venue cards/filters. */
  pitch: string;
}

export interface SizeInfo {
  id: SizeId;
  label: string;
  widthCm: number;
  heightCm: number;
  orientations: Orientation[];
}
