import Image from "next/image";
import type { Artwork } from "@/lib/content/schema";
import { getBlurDataURL } from "@/lib/content";
import { wallColour } from "@/content/finishes";
import { ScrollParallax } from "@/components/motion/parallax";

/**
 * The home hero: a gallery wall.
 *
 * Rather than a photograph of art, the hero IS art on a wall — framed pieces
 * hung at different sizes and heights, the way an installer would arrange
 * them. It demonstrates the product in the first three seconds instead of
 * describing it, and it is built from the same catalogue data as everything
 * else, so it can never show a piece the studio no longer offers.
 *
 * The copy and the wall occupy separate columns rather than stacking. An
 * earlier revision laid the headline over the whole arrangement, which needed
 * a scrim heavy enough to wash the artwork out — defeating the point of
 * showing it. Here the text sits on clean wall to the left and the pieces hang
 * to the right, so both are fully legible with only a soft edge fade between.
 *
 * Performance notes, since this is the LCP surface:
 *
 * - The anchor piece is eagerly loaded at high fetch priority and is never
 *   animated from transparent. An element that starts at opacity 0 is not
 *   counted as painted, which would push LCP out by the animation duration.
 * - Every frame reserves its space through an explicit aspect ratio, so
 *   nothing shifts as images arrive.
 * - Parallax is applied imperatively after mount, transform only, desktop
 *   only. See components/motion/parallax.tsx.
 */

/**
 * Positions within the wall column, as percentages of that column.
 * `parallax` is drift per pixel scrolled — nearer pieces move more.
 */
const WALL_LAYOUT = [
  { left: 3, top: 6, width: 24, parallax: 0.05, anchor: false },
  { left: 33, top: 2, width: 32, parallax: 0.1, anchor: false },
  { left: 71, top: 6, width: 26, parallax: 0.07, anchor: false },
  { left: 6, top: 55, width: 25, parallax: 0.14, anchor: true },
  { left: 38, top: 63, width: 22, parallax: 0.18, anchor: false },
  { left: 68, top: 58, width: 28, parallax: 0.11, anchor: false },
] as const;

function Frame({
  artwork,
  sizes,
  anchor,
}: {
  artwork: Artwork;
  sizes: string;
  anchor: boolean;
}) {
  const blur = getBlurDataURL(artwork.slug);
  return (
    <div
      // Painted in the piece's own wall tone. On the site's surface colour a
      // white-lettered piece made for a dark wall came out as pale grey on
      // white — present in the DOM, invisible on the page.
      className="relative rounded-[3px] p-[4%] shadow-[0_20px_44px_-22px_rgba(25,21,16,0.6)] ring-1 ring-black/5"
      style={{
        aspectRatio: `${artwork.image.width} / ${artwork.image.height}`,
        backgroundColor: wallColour(artwork.wallTone),
      }}
    >
      <Image
        src={artwork.image.src}
        alt=""
        fill
        sizes={sizes}
        {...(anchor
          ? { fetchPriority: "high" as const, loading: "eager" as const }
          : { loading: "lazy" as const })}
        className="object-contain p-[4%]"
        {...(blur ? { placeholder: "blur" as const, blurDataURL: blur } : {})}
      />
    </div>
  );
}

export function HeroWall({
  artworks,
  children,
}: {
  /** Six pieces; extras are ignored. */
  artworks: Artwork[];
  /** Headline and calls to action. */
  children: React.ReactNode;
}) {
  const pieces = artworks.slice(0, WALL_LAYOUT.length);
  const anchorPiece = pieces[3] ?? pieces[0];

  return (
    <section
      id="hero-wall"
      className="relative isolate overflow-hidden bg-[color-mix(in_srgb,var(--brand-line)_26%,white)]"
    >
      <ScrollParallax containerId="hero-wall" />

      {/* Room light: a soft wash from above, enough to read as a wall without
          competing with what is hung on it. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(130%_80%_at_60%_-10%,rgba(255,255,255,0.9),transparent_60%)]"
      />

      <div className="relative mx-auto grid w-full max-w-6xl gap-8 px-4 pb-16 pt-10 sm:px-6 lg:min-h-[86svh] lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center lg:gap-10 lg:py-20 2xl:max-w-[84rem] 2xl:gap-16 2xl:px-10">
        {/* Copy */}
        <div className="order-2 lg:order-1">{children}</div>

        {/* The wall — large screens get the full arrangement. */}
        <div aria-hidden className="order-1 hidden lg:order-2 lg:block">
          <div className="relative aspect-[5/4] w-full">
            {pieces.map((artwork, i) => {
              const spot = WALL_LAYOUT[i];
              return (
                <div
                  key={artwork.slug}
                  data-parallax={spot.parallax}
                  className="absolute will-change-transform"
                  style={{
                    left: `${spot.left}%`,
                    top: `${spot.top}%`,
                    width: `${spot.width}%`,
                  }}
                >
                  <Frame artwork={artwork} sizes="18vw" anchor={spot.anchor} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Below large screens, three pieces in a row reads as a wall without
            the clutter — and costs three requests instead of six. */}
        <div
          aria-hidden
          className="order-1 flex items-end justify-center gap-4 lg:hidden"
        >
          {[pieces[1], pieces[3], pieces[5]].filter(Boolean).map((artwork, i) => (
            <div
              key={artwork.slug}
              className={
                i === 1 ? "w-[38%] max-w-[220px]" : "w-[27%] max-w-[160px] pb-6"
              }
            >
              <Frame
                artwork={artwork}
                sizes="(min-width: 640px) 30vw, 38vw"
                anchor={i === 1}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Edge fade into the next section, so the wall ends rather than stops. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-background"
      />
      {/* Screen readers get the anchor piece named rather than six empty frames. */}
      <p className="sr-only">
        Featured on the wall: {anchorPiece?.title}
        {anchorPiece ? `. ${anchorPiece.alt}` : ""}
      </p>
    </section>
  );
}
