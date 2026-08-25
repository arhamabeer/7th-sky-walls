import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/config/site.config";
import { getArtworks, getCollections, getVenues } from "@/lib/content";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified, changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/portfolio"), lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/collections"), lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/spaces"), lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/services"), lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/about"), lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/contact"), lastModified, changeFrequency: "monthly", priority: 0.7 },
  ];

  const artworkRoutes: MetadataRoute.Sitemap = getArtworks().map((artwork) => ({
    url: absoluteUrl(`/portfolio/${artwork.slug}`),
    lastModified,
    changeFrequency: "monthly",
    priority: 0.7,
    images: [absoluteUrl(artwork.image.src)],
  }));

  const collectionRoutes: MetadataRoute.Sitemap = getCollections().map((collection) => ({
    url: absoluteUrl(`/collections/${collection.id}`),
    lastModified,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const venueRoutes: MetadataRoute.Sitemap = getVenues().map((venue) => ({
    url: absoluteUrl(`/spaces/${venue.id}`),
    lastModified,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...collectionRoutes, ...venueRoutes, ...artworkRoutes];
}
