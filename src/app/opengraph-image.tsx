import { ImageResponse } from "next/og";
import { site } from "@/config/site.config";

export const alt = `${site.name} — ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default branded OG card; artwork pages provide their own images. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: site.colors.background,
          color: site.colors.ink,
        }}
      >
        <div
          style={{
            width: 88,
            height: 10,
            backgroundColor: site.colors.accent,
            borderRadius: 5,
          }}
        />
        <div style={{ marginTop: 48, fontSize: 96, fontWeight: 700, letterSpacing: -3 }}>
          {site.name}
        </div>
        <div style={{ marginTop: 20, fontSize: 40, color: site.colors.muted }}>
          {site.tagline}
        </div>
      </div>
    ),
    size,
  );
}
