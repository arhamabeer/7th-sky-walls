import Image from "next/image";
import { getFinish } from "@/content/finishes";
import { cn } from "@/lib/utils";

/**
 * An artwork rendered inside a chosen frame finish.
 *
 * The frame is drawn in CSS at a width proportional to the piece's short edge,
 * matching how the AR texture composites it — so the on-screen preview and the
 * 3D model agree about what a "slim aluminium" frame looks like.
 */
export function FramedArtwork({
  src,
  alt,
  width,
  height,
  finishId,
  sizes,
  priority = false,
  blurDataURL,
  className,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  finishId: string;
  sizes: string;
  priority?: boolean;
  blurDataURL?: string;
  className?: string;
}) {
  const finish = getFinish(finishId);
  // The frame reads as a proportion of the short edge, as it does in reality.
  const framePct = finish.widthRatio * 100 * (Math.min(width, height) / Math.max(width, height) < 0.5 ? 1.6 : 1);

  return (
    <div
      className={cn(
        "relative shadow-[0_16px_38px_-18px_rgba(25,21,16,0.55)] transition-[padding,background-color] duration-300 motion-reduce:transition-none",
        className,
      )}
      style={{
        aspectRatio: `${width} / ${height}`,
        backgroundColor: finish.colour,
        padding: `${framePct}%`,
      }}
    >
      {/* Inner edge, so the frame reads as having depth rather than being a border. */}
      <div
        className="relative h-full w-full"
        style={{ boxShadow: `0 0 0 1px ${finish.innerColour}` }}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          className="object-cover"
          {...(priority
            ? { fetchPriority: "high" as const, loading: "eager" as const }
            : {})}
          {...(blurDataURL ? { placeholder: "blur" as const, blurDataURL } : {})}
        />
      </div>
    </div>
  );
}
