/**
 * Runs Lighthouse against the production build.
 *
 * SEO and Best Practices are the gated categories — the brief asks for 90+ on
 * both. Performance is reported but treated as informational: it is measured
 * here on a throttled mobile profile against a local server, and the number
 * that actually matters is field data from real devices, which only exists
 * after launch.
 *
 * Usage:
 *   node scripts/lighthouse.mjs [baseUrl] [--desktop]
 */
import { chromium } from "playwright";
import lighthouse from "lighthouse";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const BASE = (args.find((a) => a.startsWith("http")) || "http://localhost:4010").replace(/\/$/, "");
const DESKTOP = args.includes("--desktop");
const OUT = path.resolve(import.meta.dirname, "..", ".lighthouse");

const ROUTES = [
  { path: "/", name: "home" },
  { path: "/portfolio", name: "portfolio" },
  { path: "/portfolio/sabr", name: "artwork" },
  { path: "/collections", name: "collections" },
  { path: "/collections/sacred-lines", name: "collection" },
  { path: "/spaces", name: "spaces" },
  { path: "/spaces/office", name: "space" },
  { path: "/planner", name: "planner" },
  {
    path: "/portfolio/sabr/template",
    name: "template",
    // The only thing costing this route SEO points is is-crawlable, and it is
    // noindex on purpose: a print template duplicates the artwork page's content
    // and is a poor answer to any search that could surface it. Accessibility and
    // best practices are still gated, which is what actually matters here.
    ungated: ["seo"],
    ungatedWhy: "noindex by design — see the route's generateMetadata",
  },
  { path: "/materials", name: "materials" },
  { path: "/services", name: "services" },
  { path: "/about", name: "about" },
  { path: "/contact", name: "contact" },
];

/** Categories that must clear the bar for the build to be considered ready. */
const GATED = { seo: 90, "best-practices": 90, accessibility: 90 };

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ args: ["--remote-debugging-port=9222"] });
const port = 9222;

const rows = [];
let failures = 0;

for (const route of ROUTES) {
  const result = await lighthouse(
    BASE + route.path,
    {
      port,
      output: "json",
      logLevel: "error",
      screenEmulation: DESKTOP ? { disabled: true } : undefined,
      formFactor: DESKTOP ? "desktop" : "mobile",
      throttling: DESKTOP
        ? { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1 }
        : undefined,
    },
    undefined,
  );

  if (!result?.lhr) {
    console.log(`FAIL ${route.name}: Lighthouse returned no result`);
    failures++;
    continue;
  }

  const { lhr } = result;
  const scores = Object.fromEntries(
    Object.entries(lhr.categories).map(([id, c]) => [id, Math.round((c.score ?? 0) * 100)]),
  );
  rows.push({ route: route.name, ...scores });

  for (const [category, minimum] of Object.entries(GATED)) {
    // Named out loud rather than quietly skipped: an exemption nobody sees is
    // indistinguishable from a gate that stopped working.
    if (route.ungated?.includes(category)) {
      console.log(
        `SKIP ${route.name} ${category} = ${scores[category]} — ${route.ungatedWhy}`,
      );
      continue;
    }
    if ((scores[category] ?? 0) < minimum) {
      failures++;
      const failed = Object.values(lhr.audits)
        .filter((a) => a.score !== null && a.score < 1 && a.scoreDisplayMode !== "informative")
        .filter((a) =>
          (lhr.categories[category].auditRefs ?? []).some((ref) => ref.id === a.id),
        )
        .map((a) => `      ${a.id}: ${a.title}`);
      console.log(
        `FAIL ${route.name} ${category} = ${scores[category]} (need ${minimum})\n${failed.slice(0, 8).join("\n")}`,
      );
    }
  }

  await writeFile(
    path.join(OUT, `${DESKTOP ? "desktop" : "mobile"}--${route.name}.json`),
    JSON.stringify(lhr),
  );
}

await browser.close();

const pad = (s, n) => String(s).padEnd(n);
console.log(`\nLighthouse (${DESKTOP ? "desktop" : "mobile"}) — ${BASE}\n`);
console.log(
  `${pad("route", 14)}${pad("perf", 7)}${pad("a11y", 7)}${pad("best", 7)}${pad("seo", 7)}`,
);
for (const row of rows) {
  console.log(
    `${pad(row.route, 14)}${pad(row.performance ?? "-", 7)}${pad(row.accessibility ?? "-", 7)}${pad(row["best-practices"] ?? "-", 7)}${pad(row.seo ?? "-", 7)}`,
  );
}

const worst = (key) => Math.min(...rows.map((r) => r[key] ?? 0));
console.log(
  `\nLowest — accessibility ${worst("accessibility")}, best practices ${worst("best-practices")}, SEO ${worst("seo")}, performance ${worst("performance")}`,
);
console.log(
  failures
    ? `\nRESULT: FAIL — ${failures} gated score(s) below target.\n`
    : "\nRESULT: PASS — every gated category at or above target.\n",
);
process.exit(failures ? 1 : 0);
