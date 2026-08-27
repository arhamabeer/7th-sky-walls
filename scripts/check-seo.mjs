/**
 * The SEO facts nothing else looks at.
 *
 * SEO is a stated non-negotiable here and Lighthouse scores it 100 on every
 * route — but Lighthouse's SEO audit is shallow by design. It checks that a
 * description exists, that the page is crawlable, that links have text. It never
 * asks whether the canonical URL points at the page carrying it, whether the
 * sitemap lists the pages that exist, or whether two pages claim the same title.
 * Those are the failures that quietly cost rankings: a canonical pointing
 * elsewhere asks search engines to drop the page, and a route missing from the
 * sitemap is a route they may never come back for.
 *
 * They are also exactly the drift this codebase produces. The sitemap is
 * generated from the same content the pages are, so adding a route type without
 * adding it to the sitemap is a two-places-one-fact defect waiting to happen —
 * and it would show up as a page silently absent from search, months later.
 *
 * Measured before this was written and all four axes were clean: 50 routes, 50
 * sitemap entries, no mismatched canonicals, no duplicate titles or
 * descriptions, 26 structured-data blocks all valid. This exists to keep it that
 * way, not to fix something.
 *
 * Usage: node scripts/check-seo.mjs [baseUrl]
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { assertServing } from "./lib/server.mjs";

const BASE = (process.argv[2] || "http://localhost:4010").replace(/\/$/, "");
await assertServing(BASE);

const ROOT = path.resolve(import.meta.dirname, "..");
const read = async (...p) => JSON.parse(await readFile(path.join(ROOT, "src", "content", ...p), "utf8"));

const artworks = await read("artworks.json");
const collections = await read("collections.json");
const venues = await read("venues.json");

/**
 * Every route the content implies, derived rather than listed.
 *
 * A hardcoded list here would be the same defect one layer up: it would agree
 * with a stale sitemap.
 */
const STATIC_ROUTES = [
  "/",
  "/portfolio",
  "/collections",
  "/spaces",
  "/planner",
  "/materials",
  "/services",
  "/about",
  "/contact",
];
const expected = [
  ...STATIC_ROUTES,
  ...artworks.map((a) => `/portfolio/${a.slug}`),
  ...collections.map((c) => `/collections/${c.id}`),
  ...venues.map((v) => `/spaces/${v.id}`),
];

const failures = [];
const fail = (what, detail) => failures.push(`${what} — ${detail}`);

const xml = await fetch(`${BASE}/sitemap.xml`).then((r) => r.text());
const listed = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);

if (listed.length === 0) {
  console.error(
    "The sitemap listed no URLs, so every comparison below would pass on nothing. " +
      "Either it is broken or its format changed.",
  );
  process.exit(2);
}

const listedSet = new Set(listed);
for (const route of expected) {
  if (!listedSet.has(route)) fail(route, "exists but is missing from the sitemap");
}
for (const route of listedSet) {
  if (!expected.includes(route)) fail(route, "is in the sitemap but is not a route the content implies");
}

/**
 * The print template must stay out.
 *
 * It is `noindex` on purpose — it duplicates the artwork page's content and is a
 * poor answer to any search that could surface it. Listing a noindex page in a
 * sitemap is a contradiction search engines report as an error.
 */
const templateRoute = `/portfolio/${artworks[0].slug}/template`;
const templateHtml = await fetch(`${BASE}${templateRoute}`).then((r) => r.text());
if (!/noindex/.test(templateHtml)) fail(templateRoute, "is no longer noindex");
if (listedSet.has(templateRoute)) fail(templateRoute, "is noindex but appears in the sitemap");

const titles = new Map();
const descriptions = new Map();
let structuredBlocks = 0;

for (const route of listed) {
  const res = await fetch(`${BASE}${route}`);
  if (res.status !== 200) {
    fail(route, `is in the sitemap but returns ${res.status}`);
    continue;
  }
  const html = await res.text();

  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  if (!canonical) fail(route, "has no canonical URL");
  else if (new URL(canonical).pathname !== route) {
    fail(route, `declares its canonical as ${new URL(canonical).pathname}`);
  }

  const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "";
  const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "";
  if (!title) fail(route, "has no title");
  if (!description) fail(route, "has no meta description");
  titles.set(title, [...(titles.get(title) ?? []), route]);
  descriptions.set(description, [...(descriptions.get(description) ?? []), route]);

  for (const [, raw] of html.matchAll(
    /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,
  )) {
    structuredBlocks += 1;
    try {
      const data = JSON.parse(raw);
      for (const item of Array.isArray(data) ? data : [data]) {
        if (!item["@type"]) fail(route, "has a structured-data block with no @type");
      }
    } catch (err) {
      fail(route, `has structured data that does not parse — ${String(err).slice(0, 60)}`);
    }
  }
}

for (const [title, routes] of titles) {
  if (routes.length > 1) fail(`title "${title.slice(0, 60)}"`, `is used by ${routes.join(", ")}`);
}
for (const [description, routes] of descriptions) {
  if (routes.length > 1) {
    fail(`description "${description.slice(0, 50)}…"`, `is used by ${routes.join(", ")}`);
  }
}

if (structuredBlocks === 0) {
  fail("structured data", "no blocks found on any page, so nothing was validated");
}

console.log(
  `\nChecked ${listed.length} sitemap URLs against ${expected.length} routes the content implies, ` +
    `and ${structuredBlocks} structured-data blocks.`,
);

if (failures.length === 0) {
  console.log(
    "RESULT: PASS — the sitemap is complete, every canonical points at its own page, " +
      "titles and descriptions are unique, and the structured data parses.",
  );
  process.exit(0);
}

for (const line of failures) console.error(`  ${line}`);
console.error(`\nRESULT: FAIL — ${failures.length} problem(s).`);
process.exit(1);
