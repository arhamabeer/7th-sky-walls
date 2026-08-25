import type { Metadata } from "next";
import { absoluteUrl, site } from "@/config/site.config";

/**
 * Per-page metadata helper: consistent titles, canonical URLs and
 * OpenGraph/Twitter cards, all derived from site.config.
 */
export function pageMetadata(options: {
  title: string;
  description: string;
  path: string;
  images?: Array<{ url: string; width: number; height: number; alt: string }>;
}): Metadata {
  const { title, description, path, images } = options;
  const canonical = absoluteUrl(path);
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: site.name,
      locale: site.locale,
      type: "website",
      ...(images ? { images } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
