import Image from "next/image";
import Link from "next/link";
import type { Artwork } from "@/lib/content/schema";
import { getBlurDataURL, getCollectionById } from "@/lib/content";

/**
 * Gallery tile.
 *
 * The artwork is matted inside a fixed-height tile rather than cropped to fill
 * it. Two reasons: a catalog mixing 3:4 portraits, squares and 5:2 panoramas
 * produces ragged rows and captions at inconsistent heights when every tile
 * takes its own proportions; and cropping an artwork in the grid
 * misrepresents the piece being sold. Matting solves both, and reads like
 * framed work on a gallery wall.
 */
export function ArtworkCard({
  artwork,
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
}: {
  artwork: Artwork;
  sizes?: string;
}) {
  const collection = getCollectionById(artwork.collection);
  const blur = getBlurDataURL(artwork.slug);

  return (
    <Link
      href={`/portfolio/${artwork.slug}`}
      className="group flex h-full flex-col focus-visible:outline-2 focus-visible:outline-accent"
    >
      <div className="flex flex-1 items-center justify-center overflow-hidden rounded-xl border border-line bg-surface p-6 transition-colors group-hover:border-ink/30 sm:p-8">
        <Image
          src={artwork.image.src}
          alt={artwork.alt}
          width={artwork.image.width}
          height={artwork.image.height}
          sizes={sizes}
          className="h-auto max-h-full w-auto max-w-full object-contain shadow-[0_10px_26px_-14px_rgba(0,0,0,0.45)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          {...(blur ? { placeholder: "blur" as const, blurDataURL: blur } : {})}
        />
      </div>
      <div className="mt-3 flex shrink-0 items-baseline justify-between gap-3">
        <h3 className="font-display text-lg font-medium leading-snug">{artwork.title}</h3>
        {collection && (
          <p className="shrink-0 text-xs uppercase tracking-wider text-muted">
            {collection.name}
          </p>
        )}
      </div>
    </Link>
  );
}
