import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { absoluteUrl, site } from "@/config/site.config";
import { copy } from "@/content/copy";
import { defaultMountFor, wallColour } from "@/content/finishes";
import {
  cmToInches,
  getArtworkBySlug,
  getArtworks,
  getCollectionById,
  getMaterials,
  getSizeDimensions,
  getVenueById,
} from "@/lib/content";
import {
  LABEL_STRIP_MM,
  PAPERS,
  PAPER_IDS,
  PRINT_MODES,
  isPaperId,
  isPrintMode,
  sheetCount,
  tileLayout,
  type PrintMode,
} from "@/lib/print/sheets";
import { sheetCss, sheetMetrics } from "@/components/print/sheet";
import { SpecSheet } from "@/components/print/spec-sheet";
import { CornerSheets } from "@/components/print/corner-sheets";
import { TiledSheets } from "@/components/print/tiled-sheets";
import { PrintButton } from "@/components/print/print-button";
import { Chip } from "@/components/ui/chip";
import { Container } from "@/components/ui/container";
import type { SizeId } from "@/lib/content/schema";

/**
 * True-size wall templates for one piece.
 *
 * The reason this route exists: true-to-size is the quality bar this whole site
 * is built around, and AR delivers it on Android only. On an iPhone the handoff
 * still shows a panel rather than cut letters, and on the desktop where a
 * specifier actually does their work there is no true-size affordance at all.
 * Paper has none of those constraints, and taping a template to the wall is what
 * installers do anyway.
 *
 * Three modes, in order of what they cost in paper. Every choice is a link so the
 * URL is the whole state: a specifier can send one to whoever has the printer.
 */

export async function generateStaticParams() {
  return getArtworks().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/portfolio/[slug]/template">): Promise<Metadata> {
  const { slug } = await params;
  const artwork = getArtworkBySlug(slug);
  if (!artwork) return {};
  return {
    title: `Wall template — ${artwork.title}`,
    description: `Print ${artwork.title} at true size, or take a one-page specification.`,
    // Deliberately out of the index. It is a utility for someone who already has
    // the piece open, it duplicates the artwork page's content, and a template
    // is a poor answer to any search that could surface it.
    robots: { index: false, follow: true },
    alternates: { canonical: absoluteUrl(`/portfolio/${artwork.slug}`) },
  };
}

export default async function TemplatePage({
  params,
  searchParams,
}: PageProps<"/portfolio/[slug]/template">) {
  const { slug } = await params;
  const query = await searchParams;
  const artwork = getArtworkBySlug(slug);
  if (!artwork) notFound();

  // Unrecognised query values fall back rather than 404. This is a tool reached
  // by hand-edited URLs and forwarded links; a typo should print something.
  const mode = isPrintMode(query.mode) ? query.mode : "spec";
  const paper = PAPERS[isPaperId(query.paper) ? query.paper : "a4"];
  const sizeId = (
    artwork.sizes.includes(query.size as SizeId) ? query.size : artwork.defaultSize
  ) as SizeId;

  const t = copy.template;
  const dims = getSizeDimensions(sizeId, artwork.orientation);
  const collection = getCollectionById(artwork.collection);
  const mount = defaultMountFor(artwork.materials);

  // Only the tiled mode reserves a label strip, so the layout — and therefore
  // the sheet count on the button — is computed for the mode being shown.
  const layout = tileLayout(
    dims.widthCm * 10,
    dims.heightCm * 10,
    paper,
    mode === "full" ? LABEL_STRIP_MM : 0,
  );
  // The specification is a document, so it is always a portrait page whatever
  // shape the piece is; the templates follow whichever orientation tiles into
  // fewer sheets.
  const orientation = mode === "spec" ? "portrait" : layout.orientation;
  const metrics = sheetMetrics(paper, orientation);
  const sheets = sheetCount(mode, layout);

  const materials = getMaterials();
  const pieceMaterials = artwork.materials.map((name) => {
    const match = materials.find((m) => m.name === name);
    return { name, spec: match?.spec, fire: match?.fire };
  });

  const href = (next: { mode?: PrintMode; paper?: string; size?: string }) => {
    const q = new URLSearchParams({
      mode: next.mode ?? mode,
      paper: next.paper ?? paper.id,
      size: next.size ?? sizeId,
    });
    return `/portfolio/${artwork.slug}/template?${q.toString()}`;
  };

  return (
    <>
      <style>{sheetCss(metrics)}</style>

      <div data-print-hide>
        <Container className="py-8 sm:py-12">
          <nav aria-label={copy.a11y.breadcrumb} className="text-sm text-muted">
            <Link
              href={`/portfolio/${artwork.slug}`}
              className="inline-flex min-h-11 items-center hover:text-ink"
            >
              ← {artwork.title}
            </Link>
          </nav>

          <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
            {t.title}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-8 text-muted">
            {t.subtitle}
          </p>

          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div className="space-y-6">
              <fieldset>
                <legend className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                  {t.whatToPrint}
                </legend>
                <div className="mt-3 flex flex-wrap gap-2">
                  {PRINT_MODES.map((m) => {
                    const count = sheetCount(
                      m,
                      tileLayout(
                        dims.widthCm * 10,
                        dims.heightCm * 10,
                        paper,
                        m === "full" ? LABEL_STRIP_MM : 0,
                      ),
                    );
                    return (
                      <Chip key={m} href={href({ mode: m })} active={m === mode} ariaCurrent>
                        {t.modes[m].label}
                        <span className="ml-2 text-xs">
                          {count} {count === 1 ? t.sheet : t.sheets}
                        </span>
                      </Chip>
                    );
                  })}
                </div>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
                  {t.modes[mode].blurb}
                </p>
              </fieldset>

              <fieldset>
                <legend className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                  {copy.artwork.sizesTitle}
                </legend>
                <div className="mt-3 flex flex-wrap gap-2">
                  {artwork.sizes.map((id) => {
                    const d = getSizeDimensions(id, artwork.orientation);
                    return (
                      <Chip key={id} href={href({ size: id })} active={id === sizeId} ariaCurrent>
                        {d.label}
                        <span className="ml-2 text-xs">
                          {d.widthCm} × {d.heightCm} cm
                        </span>
                      </Chip>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset>
                <legend className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                  {t.paper}
                </legend>
                <div className="mt-3 flex flex-wrap gap-2">
                  {PAPER_IDS.map((id) => (
                    <Chip
                      key={id}
                      href={href({ paper: id })}
                      active={id === paper.id}
                      ariaCurrent
                    >
                      {PAPERS[id].label}
                    </Chip>
                  ))}
                </div>
              </fieldset>
            </div>

            <aside className="rounded-2xl border border-line bg-surface p-6 lg:w-80">
              <PrintButton
                label={t.print}
                sheets={sheets}
                sheet={t.sheet}
                sheets_={t.sheets}
              />
              <h2 className="mt-6 text-sm font-semibold">{t.dialogTitle}</h2>
              <ul className="mt-2 space-y-2 text-sm leading-6 text-muted">
                <li>
                  <span className="font-medium text-ink">{t.scaleLabel}</span> Not
                  &ldquo;fit to page&rdquo; — it shrinks the sheet by about 6%,
                  which on a {dims.heightCm}&nbsp;cm piece is{" "}
                  {Math.round(dims.heightCm * 0.06)}&nbsp;cm of error.
                </li>
                <li>
                  <span className="font-medium text-ink">{t.marginsLabel}</span>{" "}
                  {t.marginsNote}
                </li>
                <li>
                  <span className="font-medium text-ink">
                    {t.backgroundsLabel}
                  </span>{" "}
                  {t.backgroundsNote}
                </li>
                <li>
                  <span className="font-medium text-ink">
                    {t.paperLabel} {paper.label}, {metrics.orientation}.
                  </span>{" "}
                  {mode === "spec"
                    ? t.specIsPortrait
                    : `${metrics.orientation === "portrait" ? "Portrait" : "Landscape"} needs the fewest sheets for this size.`}
                </li>
              </ul>
              <p className="mt-4 text-sm leading-6 text-muted">{t.pdfNote}</p>
              <p className="mt-3 text-sm leading-6 text-muted sm:hidden">
                {t.previewNote}
                {sheets > 1 && ` All ${sheets} print.`}
              </p>
            </aside>
          </div>
        </Container>
      </div>

      {/* On screen the sheets are responsive boxes with the paper's aspect ratio;
          on paper the same boxes are the paper's real size. Nothing inside knows
          which, because every measurement in there is a percentage. */}
      <div
        data-preview-scaled
        className="tpl-stack mx-auto grid max-w-[820px] gap-6 px-4 pb-16 print:max-w-none print:gap-0 print:p-0"
      >
        {mode === "spec" && (
          <SpecSheet
            title={artwork.title}
            description={artwork.description}
            collectionName={collection?.name}
            imageSrc={artwork.image.src}
            imageAlt={artwork.alt}
            wallColour={wallColour(artwork.wallTone)}
            sizeLabel={dims.label}
            widthCm={dims.widthCm}
            heightCm={dims.heightCm}
            widthIn={cmToInches(dims.widthCm)}
            heightIn={cmToInches(dims.heightCm)}
            materials={pieceMaterials}
            mountLabel={mount.name}
            venues={artwork.venues.map((v) => getVenueById(v)?.name ?? v)}
            studioName={site.name}
            studioTagline={site.tagline}
            contactEmail={site.contact.email}
            contactPhone={site.contact.phone}
            pageUrl={absoluteUrl(`/portfolio/${artwork.slug}`)}
          />
        )}

        {mode === "corners" && (
          <CornerSheets
            metrics={metrics}
            title={artwork.title}
            sizeLabel={dims.label}
            widthCm={dims.widthCm}
            heightCm={dims.heightCm}
            studioName={site.name}
          />
        )}

        {mode === "full" && (
          <TiledSheets
            metrics={metrics}
            layout={layout}
            title={artwork.title}
            sizeLabel={dims.label}
            widthCm={dims.widthCm}
            heightCm={dims.heightCm}
            imageSrc={artwork.image.src}
            studioName={site.name}
          />
        )}
      </div>
    </>
  );
}
