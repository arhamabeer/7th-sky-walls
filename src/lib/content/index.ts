import "server-only";
import { z } from "zod";
import artworksJson from "@/content/artworks.json";
import collectionsJson from "@/content/collections.json";
import servicesJson from "@/content/services.json";
import caseStudiesJson from "@/content/case-studies.json";
import blurJson from "@/content/blur.json";
import {
  ORIENTATION_ASPECT,
  SIZE_TIERS,
  VENUES,
  resolveSize,
} from "@/content/catalog";
import {
  artworkSchema,
  caseStudySchema,
  collectionSchema,
  serviceSchema,
  type Artwork,
  type CaseStudy,
  type Collection,
  type Orientation,
  type Service,
  type SizeId,
  type SizeTier,
  type VenueId,
  type VenueInfo,
} from "@/lib/content/schema";

/**
 * Content access layer. All content is validated once at module load —
 * invalid content fails the build with a readable error instead of
 * rendering a broken page. Swapping local JSON for a headless CMS later
 * only requires reimplementing this module's getters.
 */

const blurMap = blurJson as Record<string, string>;

function parseAll<S extends z.ZodTypeAny>(
  schema: S,
  data: unknown[],
  label: string,
): z.infer<S>[] {
  return data.map((item, i) => {
    const result = schema.safeParse(item);
    if (!result.success) {
      throw new Error(
        `Invalid ${label} at index ${i}: ${result.error.issues
          .map((iss) => `${iss.path.join(".")}: ${iss.message}`)
          .join("; ")}`,
      );
    }
    return result.data;
  });
}

const artworks: Artwork[] = parseAll(artworkSchema, artworksJson, "artwork");
const collections: Collection[] = parseAll(collectionSchema, collectionsJson, "collection");
const services: Service[] = parseAll(serviceSchema, servicesJson, "service");
const caseStudies: CaseStudy[] = parseAll(caseStudySchema, caseStudiesJson, "case study");

// Referential integrity: every artwork must point at a real collection.
for (const a of artworks) {
  if (!collections.some((c) => c.id === a.collection)) {
    throw new Error(`Artwork "${a.slug}" references unknown collection "${a.collection}"`);
  }
}

export function getArtworks(filter?: {
  venue?: VenueId;
  collection?: string;
}): Artwork[] {
  let list = artworks;
  if (filter?.venue) list = list.filter((a) => a.venues.includes(filter.venue!));
  if (filter?.collection) list = list.filter((a) => a.collection === filter.collection);
  return list;
}

export function getArtworkBySlug(slug: string): Artwork | undefined {
  return artworks.find((a) => a.slug === slug);
}

export function getFeaturedArtworks(): Artwork[] {
  return artworks.filter((a) => a.featured);
}

/**
 * Neighbours in catalog order, wrapping at the ends so browsing never
 * dead-ends on the first or last piece.
 */
export function getAdjacentArtworks(slug: string): {
  previous: Artwork;
  next: Artwork;
} | null {
  const index = artworks.findIndex((a) => a.slug === slug);
  if (index === -1 || artworks.length < 2) return null;
  return {
    previous: artworks[(index - 1 + artworks.length) % artworks.length],
    next: artworks[(index + 1) % artworks.length],
  };
}

/** Base64 blur placeholder for an artwork image, if generated. */
export function getBlurDataURL(slug: string): string | undefined {
  return blurMap[slug];
}

export function getCollections(): Collection[] {
  return collections;
}

export function getCollectionById(id: string): Collection | undefined {
  return collections.find((c) => c.id === id);
}

export function getServices(): Service[] {
  return services;
}

export function getCaseStudies(): CaseStudy[] {
  return caseStudies;
}

export function getVenues(): VenueInfo[] {
  return VENUES;
}

export function getVenueById(id: string): VenueInfo | undefined {
  return VENUES.find((v) => v.id === id);
}

export function getSizeTiers(): SizeTier[] {
  return SIZE_TIERS;
}

/**
 * Physical dimensions of an artwork at a given size tier. Derived from the
 * orientation's aspect ratio so every size of one artwork shares the same
 * proportions — see the note in content/catalog.ts.
 */
export function getSizeDimensions(
  sizeId: SizeId,
  orientation: Orientation,
): { widthCm: number; heightCm: number; label: string } {
  return resolveSize(sizeId, orientation);
}

/** width / height for an orientation, for laying out image containers. */
export function getOrientationAspect(orientation: Orientation): number {
  return ORIENTATION_ASPECT[orientation];
}

export function cmToInches(cm: number): number {
  return Math.round((cm / 2.54) * 10) / 10;
}
