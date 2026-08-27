/**
 * Confirms the analytics layers behave as intended: Vercel's cookieless
 * scripts always mount, and Google Analytics loads only when a measurement id
 * is configured — so development and preview deployments stay out of the
 * reporting property and no third-party script loads without one.
 *
 * Usage: node scripts/check-analytics.mjs [baseUrl]
 */
import { chromium } from "playwright";
import { assertServing } from "./lib/server.mjs";

const BASE = (process.argv[2] || "http://localhost:4020").replace(/\/$/, "");

/**
 * This check reported PASS three times in one session against a server started
 * the previous day: its default port was held by a leftover process and nothing
 * here looked at what it was talking to. A green result about yesterday's bundle
 * is worse than a red one, because the property being checked — that no
 * third-party script loads without a measurement id — belongs to the bundle
 * being served.
 */
await assertServing(BASE);

/**
 * Whether the *target* runs on Vercel, asked of the target.
 *
 * This used to read `process.env.VERCEL` — the environment of the check itself,
 * not of the site it is pointed at. Run from a laptop against the live
 * deployment it therefore concluded "off Vercel" and asserted the negative case,
 * so the checklist item this exists for ("confirm Vercel Analytics and Speed
 * Insights are receiving data") could never be confirmed by it.
 *
 * `x-vercel-id` is on every response Vercel serves, and unlike the hostname it
 * keeps working once the real domain replaces the `.vercel.app` one.
 */
const targetHeaders = await fetch(`${BASE}/`).then((r) => r.headers);
const onVercel = targetHeaders.has("x-vercel-id");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

/**
 * Detected by the globals the packages install, not by a URL.
 *
 * The old detector looked for `/_vercel/insights` and `/_vercel/speed-insights`.
 * Vercel no longer serves them there: both arrive from a randomised hex path —
 * `/74d02e7359f4429f/script.js` — specifically so ad blockers cannot match on
 * the URL. So the detector could never fire, on Vercel or off it, and paired with
 * the environment bug above the check could not fail in either direction.
 *
 * `window.va` and `window.si` are what `@vercel/analytics` and
 * `@vercel/speed-insights` install once their script runs. Measured on both
 * sides: on the live deployment both are functions and two hex scripts are
 * requested; locally both are undefined and none are.
 */
const hexScripts = [];
page.on("request", (r) => {
  const { pathname } = new URL(r.url());
  if (/^\/[0-9a-f]{12,}\/script\.js$/.test(pathname)) hexScripts.push(pathname);
});
const requested = [];
page.on("request", (r) => requested.push(r.url()));

await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(2500);

const installed = await page.evaluate(() => ({
  va: typeof window.va === "function",
  si: typeof window.si === "function",
}));

const vercelAnalytics = installed.va;
const vercelSpeed = installed.si;
const googleAnalytics = requested.some((u) => u.includes("googletagmanager.com"));
const gaConfigured = Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);

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
