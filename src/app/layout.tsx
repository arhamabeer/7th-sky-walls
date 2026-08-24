import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import "./globals.css";
import { site } from "@/config/site.config";
import { fontVariables } from "@/config/fonts";
import { copy } from "@/content/copy";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { JsonLd } from "@/components/seo/jsonld-script";
import { localBusinessJsonLd, webSiteJsonLd } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s — ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  icons: {
    icon: site.assets.mark,
    apple: site.assets.icon192,
  },
  openGraph: {
    siteName: site.name,
    locale: site.locale,
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: site.colors.background,
};

/** Brand palette from site.config, exposed to CSS as custom properties. */
const brandVars = {
  "--brand-background": site.colors.background,
  "--brand-surface": site.colors.surface,
  "--brand-ink": site.colors.ink,
  "--brand-muted": site.colors.muted,
  "--brand-line": site.colors.line,
  "--brand-accent": site.colors.accent,
  "--brand-accent-soft": site.colors.accentSoft,
  "--brand-sky": site.colors.sky,
} as CSSProperties;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang={site.locale} className={`${fontVariables} h-full antialiased`} style={brandVars}>
      <body className="flex min-h-full flex-col">
        <JsonLd data={localBusinessJsonLd()} />
        <JsonLd data={webSiteJsonLd()} />
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-5 focus:py-2.5 focus:text-sm focus:text-background"
        >
          {copy.a11y.skipToContent}
        </a>
        <Header />
        <main id="content" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
