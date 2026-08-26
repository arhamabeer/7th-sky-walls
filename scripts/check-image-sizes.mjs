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
import { existsSync, readFileSync } from "node:fs";

const BASE = (process.argv[2] || "http://localhost:4010").replace(/\/$/, "");

/** Refuse to measure a stale build — see the note in check-print-template.mjs. */
if (existsSync(".next/BUILD_ID")) {
  const expected = readFileSync(".next/BUILD_ID", "utf8").trim();
  const html = await fetch(`${BASE}/`).then((r) => r.text());
  if (!html.includes(expected)) {
    console.error(`The server at ${BASE} is not serving build ${expected}.`);
    process.exit(2);
  }
  console.log(`Serving build ${expected}.`);
}

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
    // Everything below the fold has to be loaded before it can be judged.
    await page.evaluate(async () => {
      for (let y = 0; y <= document.body.scrollHeight; y += window.innerHeight * 0.8) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(600);

    const rows = await page.evaluate((dpr) => {
      return [...document.querySelectorAll("img")]
        .map((img) => {
          const src = img.currentSrc || img.src || "";
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
    }, vp.dpr);

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
console.log("RESULT: PASS — every image is fetched at close to the size it is painted.");
