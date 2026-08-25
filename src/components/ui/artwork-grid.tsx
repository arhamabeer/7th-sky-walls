import type { Artwork } from "@/lib/content/schema";
import { ArtworkCard } from "@/components/ui/artwork-card";
import { Reveal } from "@/components/motion/reveal";
import { staggerDelay } from "@/components/motion/stagger";
import { cn } from "@/lib/utils";

/**
 * Editorial artwork grid.
 *
 * Rows share one height (`grid-auto-rows`) so captions align across the grid
 * regardless of each piece's proportions, and panoramic works span two columns
 * so a 5:2 canvas gets width to read rather than shrinking into a sliver.
 * Cards mat their artwork to that height instead of cropping it.
 */
export function ArtworkGrid({
  artworks,
  className,
  showCollection = true,
}: {
  artworks: Artwork[];
  className?: string;
  /** Suppressed where the surrounding page is already one collection. */
  showCollection?: boolean;
}) {
  return (
    <ul
      className={cn(
        "grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3",
        "[grid-auto-rows:23rem] sm:[grid-auto-rows:25rem] lg:[grid-auto-rows:27rem]",
        className,
      )}
    >
      {artworks.map((artwork, i) => {
        const wide = artwork.orientation === "panorama";
        return (
          <Reveal
            as="li"
            key={artwork.slug}
            delay={staggerDelay(i)}
            className={cn("min-h-0", wide && "sm:col-span-2")}
          >
            <ArtworkCard
              artwork={artwork}
              showCollection={showCollection}
              sizes={
                wide
                  ? "(min-width: 1024px) 66vw, (min-width: 640px) 100vw, 100vw"
                  : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              }
            />
          </Reveal>
        );
      })}
    </ul>
  );
}
