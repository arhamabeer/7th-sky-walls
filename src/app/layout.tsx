import type { Metadata, Viewport } from "next";
import "./globals.css";
import { site } from "@/config/site.config";
import { brandVars } from "@/config/brand-vars";
import { fontVariables } from "@/config/fonts";
import { copy } from "@/content/copy";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { JsonLd } from "@/components/seo/jsonld-script";
import { localBusinessJsonLd, webSiteJsonLd } from "@/lib/seo/jsonld";
import { SmoothScroll } from "@/components/motion/smooth-scroll";
import { ScrollProgress } from "@/components/motion/scroll-progress";
import { SiteAnalytics } from "@/components/analytics/analytics";

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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang={site.locale} className={`${fontVariables} h-full antialiased`} style={brandVars}>
      <head>
        {/* Without scripts the IntersectionObserver never runs, so reveal
            targets would stay hidden. Force them visible instead. */}
        <noscript>
          <style>{`.reveal[data-reveal="pending"]{opacity:1!important;transform:none!important}`}</style>
        </noscript>
      </head>
      <body className="flex min-h-full flex-col">
        <JsonLd data={localBusinessJsonLd()} />
        <JsonLd data={webSiteJsonLd()} />
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-5 focus:py-2.5 focus:text-sm focus:text-background"
        >
          {copy.a11y.skipToContent}
        </a>
        <SmoothScroll />
        <Header />
        <ScrollProgress />
        {/*
          `scroll-mt-24` because the header is sticky and this is a jump target.

          The skip link exists for the people least able to work around a layout
          problem, and it was delivering them to content with its first 65px
          behind the header: measured on a phone, the target's top edge landed at
          exactly 0 with the header occupying 0 to 65. The services sections and
          the materials cards already carry this class for the same reason; the
          one target that matters most for accessibility did not.
        */}
        <main id="content" className="flex-1 scroll-mt-24">
          {children}
        </main>
        <Footer />
        <SiteAnalytics />
      </body>
    </html>
  );
}
