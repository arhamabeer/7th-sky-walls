import Image from "next/image";
import { getMount, wallColour, type WallToneId } from "@/content/finishes";
import { cn } from "@/lib/utils";

/**
 * A piece shown as it is installed: letters on their wall, throwing a shadow.
 *
 * This replaced a component that drew a picture frame around the artwork, which
 * was wrong for the product — cut lettering has no frame and no substrate. What
 * a customer chooses is how far off the wall it sits, so the mount drives the
 * shadow: a flush piece has a tight dark edge, a 25 mm standoff throws a wide
 * soft one. The artwork PNG carries alpha, so the wall shows between the letters
 * the way it does in the room.
 *
 * `object-contain`, never `cover`: cropping a word cloud cuts words off, and the
 * proportions are what the size chart promises.
 */
export function MountedArtwork({
  src,
  alt,
  width,
  height,
  mountId,
  wallTone,
  sizes,
  priority = false,
  blurDataURL,
  className,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  mountId: string;
  wallTone: WallToneId;
  sizes: string;
  priority?: boolean;
  blurDataURL?: string;
  className?: string;
}) {
  const mount = getMount(mountId);
  const shortEdge = Math.min(width, height);
  // Shadow in the same units the mount is specified in: a fraction of the short
  // edge, so a small piece is not given a shadow sized for a large one.
  const offset = (mount.shadowRatio * shortEdge).toFixed(1);
  const blur = (mount.blurRatio * shortEdge).toFixed(1);

  return (
    <div
      className={cn(
        "relative overflow-hidden transition-colors duration-300 motion-reduce:transition-none",
        className,
      )}
      style={{
        aspectRatio: `${width} / ${height}`,
        backgroundColor: wallColour(wallTone),
      }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className="object-contain transition-[filter] duration-300 motion-reduce:transition-none"
        style={{
          filter: `drop-shadow(${offset}px ${offset}px ${blur}px rgba(0,0,0,${mount.shadowOpacity}))`,
        }}
        {...(priority
          ? { fetchPriority: "high" as const, loading: "eager" as const }
          : {})}
        {...(blurDataURL ? { placeholder: "blur" as const, blurDataURL } : {})}
      />
    </div>
  );
}
