/**
 * Responsive audit.
 *
 * Drives Chromium across the full device matrix — large/medium/small desktop
 * monitors, laptops, tablets and phones, in both orientations where relevant —
 * and reports real layout defects per page per viewport.
 *
 * Usage:
 *   node scripts/responsive-audit.mjs                     # audit all pages
 *   node scripts/responsive-audit.mjs --url http://...    # override base URL
 *   node scripts/responsive-audit.mjs --only mobile       # filter viewports
 *   node scripts/responsive-audit.mjs --shots             # save screenshots
 *
 * Exit code is 1 when any error-severity issue is found, so this can gate a
 * commit.
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const argValue = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};
const BASE = argValue("--url", process.env.AUDIT_URL || "http://localhost:3000").replace(/\/$/, "");
const ONLY = argValue("--only", null);
const SHOTS = args.includes("--shots");
const SHOT_DIR = path.resolve(import.meta.dirname, "..", ".audit");

/**
 * Viewport matrix. `class` groups them for filtering; `dpr` and `touch`
 * matter because hover-only affordances and image srcset selection differ.
 */
const VIEWPORTS = [
  // Large desktop monitors
  { name: "desktop-4k", class: "desktop", width: 2560, height: 1440, dpr: 1 },
  { name: "desktop-1440p", class: "desktop", width: 2048, height: 1152, dpr: 1 },
  { name: "desktop-1080p", class: "desktop", width: 1920, height: 1080, dpr: 1 },
  { name: "desktop-1680", class: "desktop", width: 1680, height: 1050, dpr: 1 },
  // Laptops
  { name: "laptop-1536", class: "laptop", width: 1536, height: 864, dpr: 1.25 },
  { name: "laptop-1440", class: "laptop", width: 1440, height: 900, dpr: 2 },
  { name: "laptop-1366", class: "laptop", width: 1366, height: 768, dpr: 1 },
  { name: "laptop-1280", class: "laptop", width: 1280, height: 800, dpr: 1 },
  { name: "laptop-1152", class: "laptop", width: 1152, height: 720, dpr: 1 },
  // Tablets — landscape and portrait
  { name: "ipad-pro-12.9-land", class: "tablet", width: 1366, height: 1024, dpr: 2, touch: true },
  { name: "ipad-pro-12.9-port", class: "tablet", width: 1024, height: 1366, dpr: 2, touch: true },
  { name: "ipad-pro-11-land", class: "tablet", width: 1194, height: 834, dpr: 2, touch: true },
  { name: "ipad-pro-11-port", class: "tablet", width: 834, height: 1194, dpr: 2, touch: true },
  { name: "ipad-air-land", class: "tablet", width: 1180, height: 820, dpr: 2, touch: true },
  { name: "ipad-air-port", class: "tablet", width: 820, height: 1180, dpr: 2, touch: true },
  { name: "ipad-mini-port", class: "tablet", width: 744, height: 1133, dpr: 2, touch: true },
  { name: "galaxy-tab-s-port", class: "tablet", width: 800, height: 1280, dpr: 2, touch: true },
  { name: "surface-pro-land", class: "tablet", width: 1440, height: 960, dpr: 2, touch: true },
  // Phones — portrait
  { name: "iphone-16-pro-max", class: "mobile", width: 440, height: 956, dpr: 3, touch: true },
  { name: "iphone-16-pro", class: "mobile", width: 402, height: 874, dpr: 3, touch: true },
  { name: "iphone-15", class: "mobile", width: 393, height: 852, dpr: 3, touch: true },
  { name: "iphone-14-plus", class: "mobile", width: 428, height: 926, dpr: 3, touch: true },
  { name: "iphone-13-mini", class: "mobile", width: 375, height: 812, dpr: 3, touch: true },
  { name: "iphone-se", class: "mobile", width: 375, height: 667, dpr: 2, touch: true },
  { name: "pixel-8-pro", class: "mobile", width: 448, height: 992, dpr: 2.625, touch: true },
  { name: "pixel-7", class: "mobile", width: 412, height: 915, dpr: 2.625, touch: true },
  { name: "galaxy-s24", class: "mobile", width: 384, height: 832, dpr: 3, touch: true },
  { name: "galaxy-a-series", class: "mobile", width: 360, height: 800, dpr: 2, touch: true },
  { name: "android-small", class: "mobile", width: 320, height: 658, dpr: 2, touch: true },
  // Phone landscape — the case most sites forget
  { name: "iphone-15-land", class: "mobile", width: 852, height: 393, dpr: 3, touch: true },
  { name: "galaxy-a-land", class: "mobile", width: 800, height: 360, dpr: 2, touch: true },
];

const PAGES = [
  { path: "/", name: "home" },
  { path: "/portfolio", name: "portfolio" },
  { path: "/portfolio?venue=hotel", name: "portfolio-filtered" },
  { path: "/collections", name: "collections" },
  { path: "/collections/sacred-lines", name: "collection-detail" },
  { path: "/portfolio/meridian-seven", name: "artwork-portrait" },
  { path: "/portfolio/glass-horizon", name: "artwork-landscape" },
  { path: "/portfolio/night-grid", name: "artwork-square" },
  { path: "/services", name: "services" },
  { path: "/about", name: "about" },
  { path: "/contact", name: "contact" },
];

/**
 * Runs inside the page. Returns structured defects rather than opinions, so
 * the report stays actionable.
 */
const PROBE = () => {
  const issues = [];
  const docEl = document.documentElement;
  const vw = docEl.clientWidth;

  // 1. Horizontal overflow of the document itself.
  if (docEl.scrollWidth > vw + 1) {
    // Identify the widest offending elements to make the report actionable.
    const offenders = [...document.querySelectorAll("body *")]
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { el, right: r.right, left: r.left, w: r.width };
      })
      .filter((o) => o.right > vw + 1 && o.w > 0)
      .sort((a, b) => b.right - a.right)
      .slice(0, 5)
      .map((o) => {
        const e = o.el;
        const cls = typeof e.className === "string" ? e.className.slice(0, 70) : "";
        return `${e.tagName.toLowerCase()}${e.id ? "#" + e.id : ""}.${cls} overflows to ${Math.round(o.right)}px`;
      });
    issues.push({
      severity: "error",
      kind: "horizontal-overflow",
      detail: `document scrollWidth ${docEl.scrollWidth} > viewport ${vw}`,
      offenders,
    });
  }

  // 2. Any element whose own content overflows horizontally without a scroller.
  const scrollableOverflow = [...document.querySelectorAll("body *")]
    .filter((el) => {
      if (el.scrollWidth <= el.clientWidth + 1) return false;
      const s = getComputedStyle(el);
      if (s.overflowX === "auto" || s.overflowX === "scroll") return false;
      const r = el.getBoundingClientRect();
      return r.width > 40 && r.height > 10;
    })
    .slice(0, 5)
    .map((el) => {
      const cls = typeof el.className === "string" ? el.className.slice(0, 60) : "";
      return `${el.tagName.toLowerCase()}.${cls} content ${el.scrollWidth}px in ${el.clientWidth}px`;
    });
  if (scrollableOverflow.length) {
    issues.push({
      severity: "warn",
      kind: "clipped-content",
      detail: "elements whose content is wider than their box with no scroller",
      offenders: scrollableOverflow,
    });
  }

  // 3. Touch targets below 44px on touch devices.
  const isTouch = matchMedia("(hover: none)").matches;
  if (isTouch) {
    const small = [...document.querySelectorAll("a, button, [role=button], input, select")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return false;
        // Skip visually-hidden utilities like the skip link.
        const s = getComputedStyle(el);
        if (s.position === "absolute" && r.height <= 2) return false;
        return r.height < 44 || r.width < 24;
      })
      .slice(0, 8)
      .map((el) => {
        const r = el.getBoundingClientRect();
        return `${(el.textContent || el.getAttribute("aria-label") || el.tagName).trim().slice(0, 28)} ${Math.round(r.width)}x${Math.round(r.height)}`;
      });
    if (small.length) {
      issues.push({
        severity: "warn",
        kind: "small-touch-target",
        detail: "interactive elements under 44px tall on a touch viewport",
        offenders: small,
      });
    }
  }

  // 4. Text overlapping or colliding with other text (common at tight widths).
  const textNodes = [...document.querySelectorAll("h1, h2, h3, p, li, td, th, span, a")].filter(
    (el) => el.offsetParent !== null && el.getBoundingClientRect().height > 0,
  );
  // 5. Elements extending past the right edge of their container.
  const escaped = textNodes
    .filter((el) => {
      const r = el.getBoundingClientRect();
      return r.left < -1 || r.right > vw + 1;
    })
    .slice(0, 5)
    .map((el) => `${el.tagName.toLowerCase()}: "${(el.textContent || "").trim().slice(0, 30)}"`);
  if (escaped.length) {
    issues.push({
      severity: "error",
      kind: "text-outside-viewport",
      detail: "text boxes extend beyond the viewport horizontally",
      offenders: escaped,
    });
  }

  // 6. Broken or unsized images.
  const imgs = [...document.querySelectorAll("img")];
  const broken = imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.currentSrc || i.src);
  if (broken.length) {
    issues.push({ severity: "error", kind: "broken-image", detail: `${broken.length} image(s) failed`, offenders: broken.slice(0, 5) });
  }
  const noAlt = imgs.filter((i) => !i.hasAttribute("alt"));
  if (noAlt.length) {
    issues.push({ severity: "error", kind: "missing-alt", detail: `${noAlt.length} image(s) without alt`, offenders: noAlt.slice(0, 5).map((i) => i.src) });
  }

  // 7. Font size legibility on small screens.
  if (vw < 500) {
    const tiny = textNodes
      .filter((el) => {
        const fs = parseFloat(getComputedStyle(el).fontSize);
        const txt = (el.textContent || "").trim();
        return fs > 0 && fs < 11 && txt.length > 6;
      })
      .slice(0, 5)
      .map((el) => `${Math.round(parseFloat(getComputedStyle(el).fontSize))}px: "${(el.textContent || "").trim().slice(0, 28)}"`);
    if (tiny.length) {
      issues.push({ severity: "warn", kind: "tiny-text", detail: "text under 11px on a small viewport", offenders: tiny });
    }
  }

  // 8. Fixed/sticky chrome eating too much of a short viewport.
  const header = document.querySelector("header");
  if (header) {
    const hh = header.getBoundingClientRect().height;
    if (hh > docEl.clientHeight * 0.25) {
      issues.push({
        severity: "warn",
        kind: "header-too-tall",
        detail: `sticky header is ${Math.round(hh)}px of a ${docEl.clientHeight}px viewport`,
        offenders: [],
      });
    }
  }

  // 9. Single h1 per page.
  const h1s = document.querySelectorAll("h1").length;
  if (h1s !== 1) {
    issues.push({ severity: "warn", kind: "heading-structure", detail: `${h1s} h1 elements`, offenders: [] });
  }

  return {
    issues,
    meta: {
      vw,
      scrollWidth: docEl.scrollWidth,
      scrollHeight: docEl.scrollHeight,
      imgCount: imgs.length,
    },
  };
};

async function main() {
  const viewports = ONLY ? VIEWPORTS.filter((v) => v.class === ONLY || v.name.includes(ONLY)) : VIEWPORTS;
  if (!viewports.length) {
    console.error(`No viewports matched --only ${ONLY}`);
    process.exit(1);
  }
  if (SHOTS) await mkdir(SHOT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const findings = [];
  const consoleErrors = [];
  let checks = 0;

  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.dpr,
      hasTouch: Boolean(vp.touch),
      isMobile: Boolean(vp.touch) && vp.class === "mobile",
      userAgent: vp.touch
        ? "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36"
        : undefined,
    });
    const page = await context.newPage();
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push({ viewport: vp.name, text: msg.text().slice(0, 200) });
    });
    page.on("pageerror", (err) => {
      consoleErrors.push({ viewport: vp.name, text: `pageerror: ${String(err).slice(0, 200)}` });
    });

    for (const pg of PAGES) {
      await page.goto(BASE + pg.path, { waitUntil: "networkidle", timeout: 45000 });
      // Let entrance animations settle and lazy images resolve.
      await page.evaluate(() => {
        document.documentElement.style.scrollBehavior = "auto";
        window.scrollTo(0, document.body.scrollHeight);
      });
      await page.waitForTimeout(350);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(250);

      const result = await page.evaluate(PROBE);
      checks++;
      for (const issue of result.issues) {
        findings.push({ viewport: vp.name, class: vp.class, size: `${vp.width}x${vp.height}`, page: pg.name, ...issue });
      }
      if (SHOTS) {
        await page.screenshot({
          path: path.join(SHOT_DIR, `${vp.name}--${pg.name}.jpg`),
          type: "jpeg",
          quality: 70,
          fullPage: false,
        });
      }
    }
    await context.close();
  }
  await browser.close();

  // Report, grouped by issue kind so patterns are obvious.
  const errors = findings.filter((f) => f.severity === "error");
  const warns = findings.filter((f) => f.severity === "warn");

  console.log(`\nResponsive audit: ${viewports.length} viewports x ${PAGES.length} pages = ${checks} checks`);
  console.log(`Base URL: ${BASE}`);
  console.log(`Errors: ${errors.length}   Warnings: ${warns.length}   Console errors: ${consoleErrors.length}\n`);

  const byKind = {};
  for (const f of findings) {
    byKind[f.kind] ??= [];
    byKind[f.kind].push(f);
  }
  for (const [kind, list] of Object.entries(byKind)) {
    const sev = list[0].severity.toUpperCase();
    console.log(`[${sev}] ${kind} — ${list.length} occurrence(s)`);
    // Collapse to unique viewport/page pairs, show a sample of offenders.
    const seen = new Set();
    for (const f of list) {
      const key = `${f.viewport}|${f.page}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (seen.size <= 12) {
        console.log(`  ${f.viewport} (${f.size}) ${f.page}: ${f.detail}`);
        for (const o of (f.offenders || []).slice(0, 3)) console.log(`      - ${o}`);
      }
    }
    if (seen.size > 12) console.log(`  ...and ${seen.size - 12} more viewport/page combinations`);
    console.log("");
  }

  if (consoleErrors.length) {
    console.log("Console errors:");
    const uniq = new Map();
    for (const c of consoleErrors) if (!uniq.has(c.text)) uniq.set(c.text, c.viewport);
    for (const [text, viewport] of uniq) console.log(`  [${viewport}] ${text}`);
    console.log("");
  }

  await writeFile(
    path.join(SHOT_DIR.replace(/\.audit$/, ""), ".audit-report.json"),
    JSON.stringify({ base: BASE, checks, findings, consoleErrors }, null, 2),
  ).catch(() => {});

  if (errors.length || consoleErrors.length) {
    console.log("RESULT: FAIL — fix error-severity findings above.\n");
    process.exit(1);
  }
  console.log(warns.length ? "RESULT: PASS with warnings.\n" : "RESULT: PASS — clean across all viewports.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
