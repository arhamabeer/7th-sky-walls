/**
 * Catch references to artworks and collections that no longer exist.
 *
 * Tests, audits and pages hard-code a few slugs to exercise specific shapes — a
 * panoramic piece, a customisable one, one with AR assets. When the catalogue is
 * renamed those references rot, and they rot quietly: a test that navigates to a
 * missing artwork gets the not-found page and then fails on a selector, which
 * reads as a broken feature rather than a stale string. Renaming the whole
 * catalogue left a dozen of them behind at once.
 *
 * Usage: node scripts/check-slug-refs.mjs
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

/** Files whose slugs are data rather than references. */
const SKIP = new Set(["artworks.json", "ar-manifest.json", "blur.json"]);

const PATTERNS = [
  { re: /portfolio\/([a-z0-9-]+)/g, kind: "artwork" },
  { re: /artworks\/([a-z0-9-]+)\.[0-9a-f]{8}\.png/g, kind: "artwork" },
  { re: /["'`]\/ar\/([a-z0-9-]+)\//g, kind: "artwork" },
  { re: /collections\/([a-z0-9-]+)/g, kind: "collection" },
];

/** Path segments that look like slugs but are not. */
const NOT_SLUGS = new Set(["[slug]", "[id]", "undefined", "null"]);

async function walk(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".next")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, out);
    else if (/\.(mjs|ts|tsx|json)$/.test(entry.name) && !SKIP.has(entry.name)) out.push(full);
  }
  return out;
}

const artworks = JSON.parse(
  await readFile(path.join(ROOT, "src", "content", "artworks.json"), "utf8"),
);
const collections = JSON.parse(
  await readFile(path.join(ROOT, "src", "content", "collections.json"), "utf8"),
);
const validArtworks = new Set(artworks.map((a) => a.slug));
const validCollections = new Set(collections.map((c) => c.id));

const files = [
  ...(await walk(path.join(ROOT, "scripts"))),
  ...(await walk(path.join(ROOT, "src"))),
];

const stale = new Map();
for (const file of files) {
  const text = await readFile(file, "utf8");
  for (const { re, kind } of PATTERNS) {
    for (const match of text.matchAll(re)) {
      const slug = match[1];
      if (!slug || NOT_SLUGS.has(slug)) continue;
      const valid = kind === "artwork" ? validArtworks : validCollections;
      if (valid.has(slug)) continue;
      const key = `${kind} "${slug}"`;
      if (!stale.has(key)) stale.set(key, new Set());
      stale.get(key).add(path.relative(ROOT, file).replace(/\\/g, "/"));
    }
  }
}

console.log(
  `Checked ${files.length} files against ${validArtworks.size} artworks and ${validCollections.size} collections.`,
);

if (stale.size === 0) {
  console.log("RESULT: PASS — every referenced slug exists.");
  process.exit(0);
}

for (const [key, where] of stale) {
  console.error(`  ${key} — referenced by ${[...where].join(", ")}`);
}
console.error("\nRESULT: FAIL — these slugs no longer exist in the catalogue.");
process.exit(1);
