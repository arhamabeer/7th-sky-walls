/**
 * Confirms the analytics layers behave as intended: Vercel's cookieless
 * scripts always mount, and Google Analytics loads only when a measurement id
 * is configured — so development and preview deployments stay out of the
 * reporting property and no third-party script loads without one.
 *
 * Usage: node scripts/check-analytics.mjs [baseUrl]
 */
import { chromium } from "playwright";

const BASE = (process.argv[2] || "http://localhost:4020").replace(/\/$/, "");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const requested = [];
page.on("request", (r) => requested.push(r.url()));

await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);

const scripts = await page.evaluate(() =>
  [...document.querySelectorAll("script[src]")].map((s) => s.getAttribute("src")),
);

const has = (needle) =>
  scripts.some((s) => s?.includes(needle)) || requested.some((u) => u.includes(needle));

const vercelAnalytics = has("/_vercel/insights");
const vercelSpeed = has("/_vercel/speed-insights");
const googleAnalytics = has("googletagmanager.com");
const gaConfigured = Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);
const onVercel = Boolean(process.env.VERCEL);

/**
 * Off Vercel the insights scripts must NOT be requested: they are served by
 * the Vercel edge and would 404 on every page view anywhere else.
 */
const results = [
  [
    onVercel
      ? "Vercel Analytics mounts on Vercel"
      : "Vercel Analytics does NOT load off Vercel",
    onVercel ? vercelAnalytics : !vercelAnalytics,
  ],
  [
    onVercel
      ? "Vercel Speed Insights mounts on Vercel"
      : "Vercel Speed Insights does NOT load off Vercel",
    onVercel ? vercelSpeed : !vercelSpeed,
  ],
  [
    gaConfigured
      ? "Google Analytics loads when a measurement id is set"
      : "Google Analytics does NOT load without a measurement id",
    gaConfigured ? googleAnalytics : !googleAnalytics,
  ],
];

for (const [name, pass] of results) console.log(`${pass ? "PASS" : "FAIL"}  ${name}`);
console.log(`\nGA measurement id configured: ${gaConfigured ? "yes" : "no"}`);

await browser.close();
process.exit(results.every(([, pass]) => pass) ? 0 : 1);
