import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
