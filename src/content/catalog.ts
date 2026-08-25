import type { SizeInfo, VenueInfo } from "@/lib/content/schema";

/**
 * Standard size chart (Phase 1 proposal). Physical dimensions in cm are the
 * source of truth for true-to-scale AR (Phase 3) and the size comparison UI.
 * Portrait sizes are listed width x height; landscape pieces use the same
 * sizes rotated (height x width).
 */
export const SIZE_CHART: SizeInfo[] = [
  { id: "s", label: "Small", widthCm: 45, heightCm: 60, orientations: ["portrait", "landscape"] },
  { id: "m", label: "Medium", widthCm: 60, heightCm: 90, orientations: ["portrait", "landscape"] },
  { id: "l", label: "Large", widthCm: 90, heightCm: 120, orientations: ["portrait", "landscape"] },
  { id: "xl", label: "Extra large", widthCm: 120, heightCm: 180, orientations: ["portrait", "landscape"] },
  { id: "square", label: "Square", widthCm: 80, heightCm: 80, orientations: ["square"] },
  { id: "panorama", label: "Panorama", widthCm: 150, heightCm: 60, orientations: ["landscape"] },
];

export const VENUES: VenueInfo[] = [
  { id: "office", name: "Offices", pitch: "Brand walls and focus-friendly art for workplaces." },
  { id: "cafe", name: "Cafés", pitch: "Instagrammable feature walls that anchor your interior." },
  { id: "restaurant", name: "Restaurants", pitch: "Atmosphere-setting pieces for dining rooms." },
  { id: "hotel", name: "Hotels", pitch: "Lobby statements and serene art for guest floors." },
  { id: "school", name: "Schools", pitch: "Durable, inspiring murals for halls and libraries." },
  { id: "university", name: "Universities", pitch: "Campus identity walls and department art programs." },
];
