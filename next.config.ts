import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /**
     * AVIF ahead of WebP.
     *
     * Next's default is WebP alone, and for this catalogue WebP is the wrong
     * choice: these are alpha PNGs of flat-coloured lettering, and measured
     * across ten pieces at 1080px the WebP the optimiser produced was 583KB
     * against 373KB for the original PNGs — every modern browser was being sent
     * 56% more bytes than the source format needed. AVIF came to 282KB, which is
     * 52% under the WebP and 24% under the PNG.
     *
     * Checked before trusting it: alpha survives with identical statistics
     * (min 0, max 255, mean 31.0 in all three formats), and over the pixels that
     * are actually visible the mean channel difference from the PNG is 2.0-3.1
     * out of 255 — on images that are then downscaled about threefold in use.
     * Comparing whole frames instead reports a difference of 65-85, which is the
     * arbitrary RGB underneath transparent pixels and means nothing.
     *
     * The cost is encode latency on the first request for each image and width.
     * Measured against the deployment rather than guessed: a cold variant takes
     * 0.87-1.6s end to end where a warm one takes 0.39s, so the encode adds
     * roughly half a second to a second — once per variant per region, paid by
     * whoever arrives first. Against that, every visitor after them gets about
     * 40% of the WebP bytes: /portfolio went from 444KB of images to 215KB, which
     * is a second of transfer saved on a 1.6Mbps connection, every visit.
     *
     * A per-visit saving against a once-per-region cost is worth taking. If field
     * data ever says otherwise, removing this key is the whole revert.
     *
     * Browsers without AVIF fall through to WebP exactly as before.
     */
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        /**
         * AR Quick Look asks for the artwork's USDZ directly. WebKit accepts
         * the response if either the media type is a USD type or the URL ends
         * in .usdz, so this is belt and braces — but it is the type Apple
         * serves from its own gallery, and it stops a CDN from guessing.
         *
         * USDZ is already a zip, so it must not be compressed again.
         */
        source: "/ar/:slug/:size.usdz",
        headers: [
          { key: "Content-Type", value: "model/vnd.usdz+zip" },
          { key: "Content-Encoding", value: "identity" },
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/ar/:slug/:size.glb",
        headers: [
          { key: "Content-Type", value: "model/gltf-binary" },
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
