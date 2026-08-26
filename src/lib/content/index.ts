import "server-only";
import { z } from "zod";
import artworksJson from "@/content/artworks.json";
import collectionsJson from "@/content/collections.json";
import servicesJson from "@/content/services.json";
import caseStudiesJson from "@/content/case-studies.json";
import materialsJson from "@/content/materials.json";
import venuesJson from "@/content/venues.json";
import blurJson from "@/content/blur.json";
import inkBoundsJson from "@/content/ink-bounds.json";
import arManifestJson from "@/content/ar-manifest.json";
import {
  ORIENTATION_ASPECT,
  SIZE_TIERS,
  resolveSize,
} from "@/content/catalog";
import { defaultMountFor } from "@/content/finishes";
import {
  artworkSchema,
  caseStudySchema,
  materialSchema,
  venueSchema,
  collectionSchema,
  serviceSchema,
  type Artwork,
  type CaseStudy,
  type Collection,
  type Material,
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
const inkBoundsMap = inkBoundsJson as Record<string, InkBounds>;

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
const materials: Material[] = parseAll(materialSchema, materialsJson, "material");
const venues: VenueInfo[] = parseAll(venueSchema, venuesJson, "venue");

// Referential integrity: every artwork must point at a real collection.
for (const a of artworks) {
  if (!collections.some((c) => c.id === a.collection)) {
    throw new Error(`Artwork "${a.slug}" references unknown collection "${a.collection}"`);
  }
}

/**
 * An artwork's material strings are free text, and two places look them up by
 * exact name: the specification sheet, for the spec and the fire behaviour, and
 * the venue pages. A string that matches nothing does not fail — it silently
 * prints a specification with no material spec and no fire line on it, which is
 * the one column that page exists for. So it fails here instead, at build time,
 * where a typo costs a red build rather than a wrong document in a client's hand.
 *
 * Mounting strings are excluded: they name a MountStyle, which the check below
 * covers, and they deliberately do not equal a material name.
 */
const MOUNTING_WORDS = /standoff|flush|backer/i;
for (const a of artworks) {
  for (const named of a.materials) {
    if (MOUNTING_WORDS.test(named)) continue;
    if (!materials.some((m) => m.name === named)) {
      throw new Error(
        `Artwork "${a.slug}" names material "${named}", which is not in materials.json — ` +
          `its spec and fire behaviour would be missing from the printed specification.`,
      );
    }
  }
}

/**
 * A piece that names its mounting must resolve to that mounting.
 *
 * `defaultMountFor` infers a mounting from the material for a piece that does not
 * say, and that inference used to run first — so five of twenty-eight pieces were
 * overruled about their own specification. Three MDF pieces asking for a backer
 * panel and two mirror pieces asking to sit flush all resolved to a 12mm standoff,
 * and the printed sheet named one on its material row and the other on its
 * mounting row, two lines apart.
 */
for (const a of artworks) {
  const text = a.materials.join(" ");
  const numbered = text.match(/(\d+)\s*mm\s+standoff/i);
  const expected = numbered
    ? Number(numbered[1])
    : /flush/i.test(text)
      ? 0
      : /backer/i.test(text)
        ? 18
        : null;
  if (expected === null) continue;
  const resolved = defaultMountFor(a.materials);
  if (resolved.standoffMm !== expected) {
    throw new Error(
      `Artwork "${a.slug}" names a ${expected}mm mounting in "${text}" but resolves to ` +
        `"${resolved.name}" (${resolved.standoffMm}mm). The artwork page and the printed ` +
        `specification would disagree with each other.`,
    );
  }
}

export function getArtworks(filter?: {
  venue?: VenueId;
  collection?: string;
  /** Only pieces that can be reset with the customer's own wording. */
  customText?: boolean;
}): Artwork[] {
  let list = artworks;
  if (filter?.venue) list = list.filter((a) => a.venues.includes(filter.venue!));
  if (filter?.collection) list = list.filter((a) => a.collection === filter.collection);
  if (filter?.customText) list = list.filter((a) => a.customText);
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

/**
 * The rectangle of an artwork's image that carries ink, as fractions of it.
 *
 * These are cut letters on a transparent ground, so a piece with a short word
 * leaves large empty margins — and the printable true-size template tiles the
 * whole rectangle. Measured across every piece and size, 31% of those sheets have
 * no ink on them at all; the worst is 29 blank sheets out of 35. The template uses
 * this to leave them out.
 *
 * Written by `npm run generate:placeholders`, which measures the alpha channel
 * while the pixels are already in hand.
 */
export interface InkBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Falls back to the whole rectangle, which prints everything rather than nothing. */
export function getInkBounds(slug: string): InkBounds {
  return inkBoundsMap[slug] ?? { left: 0, top: 0, right: 1, bottom: 1 };
}

/** Base64 blur placeholder for an artwork image, if generated. */
export function getBlurDataURL(slug: string): string | undefined {
  return blurMap[slug];
}

/**
 * AR assets for one artwork at one size, produced by
 * `npm run generate:ar`. Returns undefined when assets have not been
 * generated, so the UI can hide the AR affordance rather than offer a button
 * that leads nowhere.
 */
export interface ArAsset {
  glb: string;
  usdz: string;
  widthCm: number;
  heightCm: number;
  depthCm: number;
  glbBytes: number;
  usdzBytes: number;
}

interface ArManifestEntry {
  /** The wall tone the AR texture was built against. */
  wall: string;
  sizes: Record<string, ArAsset>;
}

const arManifest = arManifestJson as Record<string, ArManifestEntry>;

export function getArAssets(slug: string): Record<string, ArAsset> | undefined {
  const entry = arManifest[slug];
  if (!entry || Object.keys(entry.sizes).length === 0) return undefined;
  return entry.sizes;
}

/** The wall tone an artwork's AR texture was built against. */
export function getArWallTone(slug: string): string | undefined {
  return arManifest[slug]?.wall;
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

export function getMaterials(): Material[] {
  return materials;
}

export function getVenues(): VenueInfo[] {
  return venues;
}

export function getVenueById(id: string): VenueInfo | undefined {
  return venues.find((v) => v.id === id);
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
