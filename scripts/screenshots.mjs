/**
 * Full-page screenshots for visual review.
 *
 * Scrolls each page through once so viewport-triggered reveals complete
 * before capture — a plain full-page screenshot catches everything below the
 * fold still hidden.
 *
 * Usage:
 *   node scripts/screenshots.mjs <baseUrl> [viewport] [page...]
 *   node scripts/screenshots.mjs http://localhost:4010 desktop home portfolio
 *
 * Add `--selector <css>` to capture a single element instead of the whole
 * page, which is how a specific section gets reviewed without guessing its
 * pixel offset in a five-thousand-pixel screenshot.
 *
 * Output: .shots/<viewport>--<page>.jpg
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const argv = process.argv.slice(2);
const selectorIndex = argv.indexOf("--selector");
const SELECTOR = selectorIndex !== -1 ? argv[selectorIndex + 1] : null;
if (selectorIndex !== -1) argv.splice(selectorIndex, 2);

const BASE = (argv[0] || "http://localhost:4010").replace(/\/$/, "");
const VIEWPORT_ARG = argv[1] || "desktop";
const PAGE_ARGS = argv.slice(2);

const OUT = path.resolve(import.meta.dirname, "..", ".shots");

const VIEWPORTS = {
  desktop: { width: 1440, height: 900, touch: false },
  laptop: { width: 1280, height: 800, touch: false },
  tablet: { width: 834, height: 1194, touch: true },
  mobile: { width: 393, height: 852, touch: true },
};

const PAGES = {
  home: "/",
  portfolio: "/portfolio",
  "portfolio-office": "/portfolio?venue=office",
  collections: "/collections",
  "collection-detail": "/collections/sacred-lines",
  "artwork-portrait": "/portfolio/meridian-seven",
  "artwork-panorama": "/portfolio/glass-horizon",
  "artwork-square": "/portfolio/night-grid",
  services: "/services",
  about: "/about",
  contact: "/contact",
};

const chosenPages = PAGE_ARGS.length ? PAGE_ARGS : Object.keys(PAGES);
const vp = VIEWPORTS[VIEWPORT_ARG] ?? VIEWPORTS.desktop;

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: vp.width, height: vp.height },
  hasTouch: vp.touch,
  isMobile: vp.touch && vp.width < 768,
  deviceScaleFactor: 1,
});
const page = await context.newPage();

for (const name of chosenPages) {
  const route = PAGES[name];
  if (!route) {
    console.log(`skip unknown page "${name}"`);
    continue;
  }
  await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 45000 });

  // Walk down the page so every reveal fires, then return to the top.
  await page.evaluate(async () => {
    document.documentElement.style.scrollBehavior = "auto";
    const step = window.innerHeight * 0.65;
    for (let y = 0; y <= document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 110));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(900);

  const suffix = SELECTOR ? `--${SELECTOR.replace(/[^a-z0-9]+/gi, "-")}` : "";
  const file = path.join(OUT, `${VIEWPORT_ARG}--${name}${suffix}.jpg`);

  if (SELECTOR) {
    const element = page.locator(SELECTOR).first();
    if ((await element.count()) === 0) {
      console.log(`skip ${name}: no element matches ${SELECTOR}`);
      continue;
    }
    await element.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await element.screenshot({ path: file, type: "jpeg", quality: 80 });
  } else {
    await page.screenshot({ path: file, type: "jpeg", quality: 78, fullPage: true });
  }
  console.log(`saved ${path.relative(process.cwd(), file)}`);
}

await browser.close();
