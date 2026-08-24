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
 * Output: .shots/<viewport>--<page>.jpg
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = (process.argv[2] || "http://localhost:4010").replace(/\/$/, "");
const VIEWPORT_ARG = process.argv[3] || "desktop";
const PAGE_ARGS = process.argv.slice(4);

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

  const file = path.join(OUT, `${VIEWPORT_ARG}--${name}.jpg`);
  await page.screenshot({ path: file, type: "jpeg", quality: 78, fullPage: true });
  console.log(`saved ${path.relative(process.cwd(), file)}`);
}

await browser.close();
