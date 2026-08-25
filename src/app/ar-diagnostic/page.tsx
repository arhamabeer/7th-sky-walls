import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { ArDiagnostic } from "@/components/ar/ar-diagnostic";

/**
 * A page that reports what this device actually says about AR.
 *
 * It exists because AR capability was twice inferred from a user-agent string
 * and a reasonable-sounding assumption, and both times the inference was wrong
 * on a real handset — the second time still leaving a dead "Place on my wall"
 * button on a device with no ARCore. Guessing from here does not work; the
 * device has to be asked.
 *
 * Deliberately not linked from anywhere and excluded from the sitemap, with
 * noindex set below. It is a tool, not a page.
 */
export const metadata: Metadata = {
  title: "AR diagnostic",
  robots: { index: false, follow: false },
};

export default function ArDiagnosticPage() {
  return (
    <section className="py-10 sm:py-16">
      <Container>
        <h1 className="font-display text-3xl font-medium tracking-tight">
          AR diagnostic
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-7 text-muted">
          What this device reports about AR support. Screenshot this page — every
          value below is something the code branches on, so it says exactly why
          you are being offered what you are being offered.
        </p>
        <ArDiagnostic />
      </Container>
    </section>
  );
}
