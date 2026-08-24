import Image from "next/image";
import Link from "next/link";
import type { Artwork } from "@/lib/content/schema";
import { getBlurDataURL } from "@/lib/content";
import { cn } from "@/lib/utils";

/**
 * Previous/next navigation between artworks in catalog order. Keeps a visitor
 * moving through the collection instead of bouncing back to the grid after
 * every piece.
 */
export function ArtworkPager({
  previous,
  next,
}: {
  previous: Artwork;
  next: Artwork;
}) {
  return (
    <nav aria-label="Artwork navigation" className="mt-16 border-t border-line pt-8">
      <ul className="grid gap-4 sm:grid-cols-2">
        <PagerLink artwork={previous} direction="previous" />
        <PagerLink artwork={next} direction="next" />
      </ul>
    </nav>
  );
}

function PagerLink({
  artwork,
  direction,
}: {
  artwork: Artwork;
  direction: "previous" | "next";
}) {
  const blur = getBlurDataURL(artwork.slug);
  const isNext = direction === "next";

  return (
    <li className={cn(isNext && "sm:justify-self-end")}>
      <Link
        href={`/portfolio/${artwork.slug}`}
        rel={isNext ? "next" : "prev"}
        className={cn(
          "group flex min-h-11 items-center gap-4 rounded-xl border border-line bg-surface p-3 transition-colors hover:border-ink",
          isNext && "flex-row-reverse text-right",
        )}
      >
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-line">
          <Image
            src={artwork.image.src}
            alt=""
            fill
            sizes="64px"
            className="object-cover"
            {...(blur ? { placeholder: "blur" as const, blurDataURL: blur } : {})}
          />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            {isNext ? "Next" : "Previous"}
          </p>
          <p className="truncate font-display text-lg font-medium leading-snug">
            {artwork.title}
          </p>
        </div>
      </Link>
    </li>
  );
}
