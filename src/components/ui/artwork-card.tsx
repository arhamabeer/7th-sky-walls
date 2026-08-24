import Image from "next/image";
import Link from "next/link";
import type { Artwork } from "@/lib/content/schema";
import { getBlurDataURL, getCollectionById } from "@/lib/content";

const ASPECT: Record<Artwork["orientation"], string> = {
  portrait: "aspect-[4/5]",
  landscape: "aspect-[4/3]",
  square: "aspect-square",
};

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
      className="group block focus-visible:outline-2 focus-visible:outline-accent"
    >
      <div
        className={`relative overflow-hidden rounded-xl bg-line ${ASPECT[artwork.orientation]}`}
      >
        <Image
          src={artwork.image.src}
          alt={artwork.alt}
          fill
          sizes={sizes}
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          {...(blur ? { placeholder: "blur" as const, blurDataURL: blur } : {})}
        />
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-3">
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
