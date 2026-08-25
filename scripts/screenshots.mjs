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

const takeFlag = (name) => {
  const i = argv.indexOf(name);
  if (i === -1) return null;
  const value = argv[i + 1];
  argv.splice(i, 2);
  return value;
};

const SELECTOR = takeFlag("--selector");
/** Text of a control to click before capturing, e.g. a tab. */
const CLICK_TEXT = takeFlag("--click");

const BASE = (argv[0] || "http://localhost:4010").replace(/\/$/, "");
const VIEWPORT_ARG = argv[1] || "desktop";
const PAGE_ARGS = argv.slice(2);

const OUT = path.resolve(import.meta.dirname, "..", ".shots");

/** Representative of each screen class the site has to look right on. */
const VIEWPORTS = {
  "monitor-4k": { width: 2560, height: 1440, touch: false },
  "monitor-1080": { width: 1920, height: 1080, touch: false },
  desktop: { width: 1440, height: 900, touch: false },
  "laptop-large": { width: 1536, height: 864, touch: false },
  laptop: { width: 1280, height: 800, touch: false },
  "laptop-small": { width: 1152, height: 720, touch: false },
  "tablet-landscape": { width: 1194, height: 834, touch: true },
  tablet: { width: 834, height: 1194, touch: true },
  "tablet-small": { width: 744, height: 1133, touch: true },
  "mobile-large": { width: 440, height: 956, touch: true },
  mobile: { width: 393, height: 852, touch: true },
  "mobile-small": { width: 320, height: 658, touch: true },
  "mobile-landscape": { width: 852, height: 393, touch: true },
};

const PAGES = {
  home: "/",
  portfolio: "/portfolio",
  "portfolio-office": "/portfolio?venue=office",
  collections: "/collections",
  "collection-detail": "/collections/sacred-lines",
  planner: "/planner",
  spaces: "/spaces",
  "space-detail": "/spaces/school",
  "artwork-portrait": "/portfolio/idea-bulb",
  "artwork-custom": "/portfolio/sabr",
  "artwork-panorama": "/portfolio/ask-better-questions",
  "artwork-square": "/portfolio/outside-the-box",
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

  if (CLICK_TEXT) {
    const control = page
      .locator("button, [role=tab], a", { hasText: CLICK_TEXT })
      .first();
    if ((await control.count()) > 0) {
      await control.click();
      await page.waitForTimeout(900);
    } else {
      console.log(`  note: nothing matching "${CLICK_TEXT}" on ${name}`);
    }
  }

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
