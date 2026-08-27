/**
 * Are we downloading the pixels we actually paint?
 *
 * `next/image` picks a candidate width from the `sizes` attribute, so `sizes` has
 * to describe the rendered image. On this site it described the *card*, and the
 * images are `object-contain` inside padded, height-capped boxes — so the painted
 * width is far smaller than the card and every index page was fetching between
 * four and thirty-two times the pixels it displayed. A collections cover painted
 * at 132x176 on a 1440px screen was requesting a 750px-wide file.
 *
 * That is worth a gate rather than a one-off fix, because `sizes` is a string that
 * no type checker reads and nothing else notices when a layout changes underneath
 * it. Both directions are checked:
 *
 *   - **Over-fetching**: requesting far more pixels than are painted. Wasted bytes
 *     on the LCP of a gallery site.
 *   - **Under-fetching**: requesting fewer, which is worse — the image renders
 *     soft, and on cut lettering soft edges are the product looking cheap.
 *
 * Usage: node scripts/check-image-sizes.mjs [baseUrl]
 */
import { chromium } from "playwright";
import { assertServing } from "./lib/server.mjs";

const BASE = (process.argv[2] || "http://localhost:4010").replace(/\/$/, "");

/** Refuse to measure a stale build — see the note on `assertServing`. */
await assertServing(BASE);

const PAGES = [
  "/",
  "/portfolio",
  "/collections",
  "/collections/sacred-lines",
  "/spaces/office",
  "/planner",
  "/materials",
  "/about",
  "/portfolio/sabr",
];

const VIEWPORTS = [
  { name: "phone", width: 412, height: 915, dpr: 2.6 },
  { name: "tablet", width: 834, height: 1194, dpr: 2 },
  { name: "laptop", width: 1440, height: 900, dpr: 1 },
  { name: "desktop", width: 1920, height: 1080, dpr: 1 },
];

/**
 * How much over-fetch to tolerate, as a ratio of requested to needed pixel area.
 *
 * Not 1.0: `next/image` chooses from a fixed ladder of candidate widths, so some
 * rounding up is unavoidable and correct — a 250px need has to take the 256px
 * candidate.
 *
 * 6x rather than 4x, because the ladder's own step from 128 to 256 is already 4x
 * in area. Demanding 4x everywhere is demanding sub-rung precision that `sizes`
 * cannot express, and chasing it means adding a fourth breakpoint to every
 * component to save a rung. 6x leaves one rung of headroom and still catches the
 * real thing this exists for: a 132px image fetching a 1080px file, which is 60x.
 */
const MAX_AREA_RATIO = 6;

const browser = await chromium.launch();
const findings = [];
let measured = 0;
/** Laid-out optimised images that never chose a candidate — a coverage gap, not a pass. */
const stillPending = [];

for (const vp of VIEWPORTS) {
  for (const path of PAGES) {
    /**
     * A fresh context per page, which the first version of this got wrong.
     *
     * Sharing one context across pages shares its HTTP cache, and when a piece
     * has already been downloaded at a larger candidate width Chrome reuses that
     * rather than fetching a smaller one — correctly, since the bytes are already
     * there. So `currentSrc` reported a 1080px variant for a 48px thumbnail whose
     * `sizes` was perfectly correct, and the report blamed the markup for the
     * cache. Each page is measured as a cold arrival, which is also the only
     * scenario where the number affects anybody.
     */
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.dpr,
    });
    const page = await ctx.newPage();
    await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 60000 });
    /**
     * Wait for the fonts before measuring anything.
     *
     * Several of these images sit in boxes whose height comes from the text
     * beside them, and an `object-contain` image in a height-capped box takes its
     * width from that height. So a card measured mid font-swap is a few pixels
     * different, and a few pixels either side of a candidate-width boundary flips
     * the verdict — which made this check fail intermittently on the same build.
     */
    await page.evaluate(() => document.fonts.ready);

    // Everything below the fold has to be loaded before it can be judged.
    await page.evaluate(async () => {
      for (let y = 0; y <= document.body.scrollHeight; y += window.innerHeight * 0.8) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, 0);
    });
    // Long enough for the reveal transitions to settle, since a transform in
    // flight also changes a bounding box.
    await page.waitForTimeout(900);

    /**
     * `currentSrc` only, never `img.src`.
     *
     * `currentSrc` is the candidate the browser actually chose; it is empty until
     * one has been chosen. `img.src` on a next/image element is the no-srcset
     * fallback, which is the *largest* rung of the ladder — so falling back to it
     * reported a 3840px fetch for an image that had simply not picked anything
     * yet, and called a 77px thumbnail 365x over-fetched. Chromium supports
     * srcset, so that URL is never the resource fetched: reading it was not a
     * race being mis-measured, it was measuring the wrong string.
     *
     * An image with no `currentSrc` is pending rather than innocent, so it is
     * counted and given another moment below — and anything still pending is
     * reported, because a silent skip is how a gate loses coverage.
     */
    const measureRows = () => page.evaluate((dpr) => {
      let pending = 0;
      const rows = [...document.querySelectorAll("img")]
        .map((img) => {
          const src = img.currentSrc || "";
          if (!src) {
            const box = img.getBoundingClientRect();
            // Only count what is laid out; a display:none image has nothing to fetch.
            if (box.width >= 8 && (img.getAttribute("src") || "").includes("/_next/image")) {
              pending += 1;
            }
            return null;
          }
          // Only optimised artwork. Icons, the wordmark and inline data URLs are
          // not served through a width ladder and have nothing to judge.
          if (!src.includes("/_next/image")) return null;
          const requested = Number((src.match(/[?&]w=(\d+)/) || [])[1] || 0);
          const box = img.getBoundingClientRect();
          if (!requested || box.width < 8) return null;
          return {
            needed: Math.round(box.width * dpr),
            requested,
            natural: img.naturalWidth,
            rendered: `${Math.round(box.width)}x${Math.round(box.height)}`,
            what: decodeURIComponent(src).match(/artworks\/([a-z0-9-]+)\./)?.[1] ?? "image",
            // Reported with every finding so it maps back to the call site that
            // owns it. Without this the report says a piece is over-fetched on
            // four pages and leaves you to guess which component did it.
            sizes: img.getAttribute("sizes") ?? "(none)",
          };
        })
        .filter(Boolean);
      return { rows, pending };
    }, vp.dpr);

    let { rows, pending } = await measureRows();
    if (pending > 0) {
      /**
       * Put whatever is still pending in front of the viewport and wait for it.
       *
       * The scroll pass above steps through the page at 80% of a viewport every
       * 120ms, which is enough for most of it but not for a small image far down
       * a long page: the to-scale wall demonstration sits 8400px down on a phone
       * and is 77px wide, and it had not started loading by the time the pass
       * returned to the top. Waiting longer did not help, because nothing had
       * asked for it. Centring each one does, and it is the same thing a visitor
       * does by scrolling there.
       */
      await page.evaluate(async () => {
        const stillPending = [...document.querySelectorAll("img")].filter(
          (img) => !img.currentSrc && (img.getAttribute("src") || "").includes("/_next/image"),
        );
        for (const img of stillPending) {
          img.scrollIntoView({ block: "center" });
          for (let i = 0; i < 20 && !img.currentSrc; i += 1) {
            await new Promise((r) => setTimeout(r, 150));
          }
        }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(300);
      ({ rows, pending } = await measureRows());
    }
    if (pending > 0) {
      stillPending.push(`${vp.name} ${path}: ${pending} image(s) never chose a candidate`);
    }

    for (const r of rows) {
      measured += 1;
      const areaRatio = (r.requested / r.needed) ** 2;
      if (r.requested < r.needed * 0.9) {
        findings.push({
          severity: "error",
          page: path,
          vp: vp.name,
          text: `[${r.sizes}] ${r.what} painted ${r.rendered} needs ${r.needed}px but only ${r.requested}px was fetched — it renders soft`,
        });
      } else if (areaRatio > MAX_AREA_RATIO) {
        findings.push({
          severity: "warn",
          page: path,
          vp: vp.name,
          text: `[${r.sizes}] ${r.what} painted ${r.rendered} needs ${r.needed}px, fetched ${r.requested}px — ${areaRatio.toFixed(1)}x the pixels`,
        });
      }
    }
    await ctx.close();
  }
}

await browser.close();

const errors = findings.filter((f) => f.severity === "error");
const warns = findings.filter((f) => f.severity === "warn");

console.log(
  `\nMeasured ${measured} optimised images across ${PAGES.length} pages and ${VIEWPORTS.length} viewports.`,
);
console.log(`Under-fetched: ${errors.length}   Over-fetched beyond ${MAX_AREA_RATIO}x: ${warns.length}\n`);

if (stillPending.length) {
  console.log("Images that never chose a candidate, so they were not judged:");
  for (const line of stillPending) console.log(`  ${line}`);
  console.log("");
}

for (const f of [...errors, ...warns].slice(0, 40)) {
  console.log(`  [${f.severity.toUpperCase()}] ${f.vp} ${f.page}: ${f.text}`);
}
if (findings.length > 40) console.log(`  ...and ${findings.length - 40} more`);

if (errors.length) {
  console.log("\nRESULT: FAIL — images are being served smaller than they are painted.");
  process.exit(1);
}
if (warns.length) {
  console.log("\nRESULT: FAIL — images are being served much larger than they are painted.");
  process.exit(1);
}

/**
 * Refuse to pass on nothing measured.
 *
 * Every verdict here is the absence of a finding, so a run that measured no
 * images reads identically to a run that found every image correct. The way that
 * happens is not exotic: this check recognises optimised images by their
 * `/_next/image` URL, and a config change, a different loader or a renamed
 * attribute would leave it measuring zero and reporting success. Each of these
 * pages carries artwork at every viewport, so one measurement per page is a
 * floor that is true today and worth failing on if it stops being true.
 */
const perPage = Math.floor(measured / PAGES.length);
if (measured === 0 || perPage < 1) {
  console.log(
    `\nRESULT: FAIL — measured ${measured} optimised images across ${PAGES.length} pages. ` +
      `Every one of these pages carries artwork, so this run measured nothing and proves nothing.`,
  );
  process.exit(1);
}
console.log("RESULT: PASS — every image is fetched at close to the size it is painted.");
