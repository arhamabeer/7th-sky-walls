import type { MetadataRoute } from "next";
import { site } from "@/config/site.config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: site.name,
    description: site.description,
    start_url: "/",
    display: "standalone",
    background_color: site.colors.background,
    theme_color: site.colors.background,
    icons: [
      { src: site.assets.icon192, sizes: "192x192", type: "image/png" },
      { src: site.assets.icon512, sizes: "512x512", type: "image/png" },
    ],
  };
}
