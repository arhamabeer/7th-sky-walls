/**
 * Catch references to artworks and collections that no longer exist — by slug in
 * the code, and by title in the docs.
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

/**
 * The docs name pieces by title, not by slug, and those rot the same way.
 *
 * The AR device checklist opened with "use Minaret Dawn for the first run" for a
 * day after the product-category rebuild deleted that piece — and a checklist
 * whose first instruction names something that does not exist is a checklist
 * nobody finishes. Slugs were covered; titles in prose were not.
 *
 * Only **bold** phrases are checked, because that is how these documents mark
 * something to open or click. A title mentioned in passing is prose, and matching
 * every capitalised phrase in a design document against the catalogue would find
 * nothing but false positives.
 */
const validTitles = new Set([
  ...artworks.map((a) => a.title),
  ...collections.map((c) => c.name),
]);

/** Bold phrases that are interface labels or checklist headings, not pieces. */
const NOT_TITLES = /^(On your wall|Place on my wall|Make it yours|Small|Medium|Large|Extra large|WebXR|Scene Viewer|Quick Look|Print|Paper|Materials|Specification|Corner marks|Full template|Consult|Design|Produce|Install|Urdu|Arabic|Latin|Verified|Scale|Margins|Background graphics|SEO|Best practices|Narrowed|Still needed)\b/;

const docFiles = (await readdir(path.join(ROOT, "docs")))
  .filter((f) => f.endsWith(".md"))
  .map((f) => path.join(ROOT, "docs", f));

const staleTitles = new Map();
for (const file of docFiles) {
  const text = await readFile(file, "utf8");
  for (const match of text.matchAll(/\*\*([A-Z][A-Za-z&'’ ]{2,30})\*\*/g)) {
    const phrase = match[1].trim();
    if (NOT_TITLES.test(phrase) || validTitles.has(phrase)) continue;
    // A phrase that reads as a piece name: two or three capitalised words, or one.
    if (!/^[A-Z][a-z]+(?: [A-Z][a-z]+){0,2}$/.test(phrase)) continue;
    const key = `title "${phrase}"`;
    if (!staleTitles.has(key)) staleTitles.set(key, new Set());
    staleTitles.get(key).add(path.relative(ROOT, file).replace(/\\/g, "/"));
  }
}

/**
 * File paths named in the docs, checked by extension rather than by existence.
 *
 * The plan told anyone ingesting real work to "drop `<slug>.jpg`", and
 * `readMaster` looks for `<slug>.png` only — so following the instruction did
 * nothing at all, silently, and the site went on serving placeholders. Two
 * paragraphs still said `.jpg` from before the catalogue moved to PNG for alpha.
 *
 * Existence is the wrong test: `public/artworks/<slug>.png` is deliberately a
 * file that does not exist yet, because it is the file the author is being told
 * to create. What is testable is the extension. Every directory here holds one
 * or two formats and that is a deliberate pipeline decision — artworks are PNG
 * because they carry alpha, AR assets are GLB and USDZ because those are what
 * the two platforms accept — so a path naming a format its own directory does
 * not contain is naming something the pipeline cannot read.
 */
const PUBLIC_ROOTS = new Set(["artworks", "ar", "og", "brand"]);

async function extensionsUnder(dir, out = new Set(), depth = 0) {
  if (depth > 3) return out;
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) await extensionsUnder(path.join(dir, entry.name), out, depth + 1);
    else {
      const ext = path.extname(entry.name).toLowerCase();
      if (ext) out.add(ext);
    }
  }
  return out;
}

/** The leading portion of a path with no `<placeholder>` or `*` in it. */
const staticPrefix = (p) => {
  const parts = p.split("/");
  const stop = parts.findIndex((s) => s.includes("<") || s.includes("*"));
  return (stop === -1 ? parts.slice(0, -1) : parts.slice(0, stop)).join("/");
};

const badPaths = new Map();
for (const file of docFiles) {
  const text = await readFile(file, "utf8");
  for (const match of text.matchAll(/`([^`\s]*\/[^`\s]*\.[a-z0-9]{2,5})`/gi)) {
    let ref = match[1];
    const ext = path.extname(ref).toLowerCase();
    // A leading-slash path is a URL the site serves out of public/.
    if (ref.startsWith("/")) {
      const root = ref.split("/")[1];
      if (!PUBLIC_ROOTS.has(root)) continue;
      ref = `public${ref}`;
    }
    if (!/^(public|src|scripts|docs)\//.test(ref)) continue;

    const prefix = staticPrefix(ref);
    const found = await extensionsUnder(path.join(ROOT, prefix));
    if (found.size === 0) continue; // nothing to compare against
    if (found.has(ext)) continue;

    const key = `\`${match[1]}\` — ${prefix}/ holds ${[...found].sort().join(", ")}`;
    if (!badPaths.has(key)) badPaths.set(key, new Set());
    badPaths.get(key).add(path.relative(ROOT, file).replace(/\\/g, "/"));
  }
}

/**
 * Counts the docs state about the harness, checked against the lists they count.
 *
 * The launch checklist said 363 interaction checks and 286 images measured, and
 * both had moved. Those two are runtime results and are simply gone from the
 * prose now — a number kept in two places is the defect this codebase produces
 * most. The ones worth keeping are structural: they come from a list in a script,
 * so they can be counted rather than remembered.
 *
 * Each claim is matched only where the noun follows the number, and each count
 * comes from the body of a named array, so a rename fails loudly here rather than
 * silently agreeing.
 */
function arrayLength(source, name) {
  const start = source.indexOf(`const ${name} = [`);
  if (start === -1) return null;
  const body = source.slice(start, source.indexOf("\n];", start));
  return body.split("\n").filter((line) => /^\s{2}\{/.test(line)).length;
}

const auditSource = await readFile(path.join(ROOT, "scripts", "responsive-audit.mjs"), "utf8");
const lighthouseSource = await readFile(path.join(ROOT, "scripts", "lighthouse.mjs"), "utf8");

/**
 * Each pattern names its context, because the bare nouns are ambiguous here and a
 * check that cannot tell two meanings apart is a check that cries wolf. "Pages"
 * means the audit's page list, the paper sheets a full template prints (8 to 63
 * of them), and the page-viewport combinations a finding is counted in — three
 * different numbers in the same document. Only the first is a list that can be
 * counted, so only the first is claimed.
 */
const CLAIMS = [
  {
    label: "viewports",
    pattern: /\b(\d+)\s+viewports\b/gi,
    actual: arrayLength(auditSource, "VIEWPORTS"),
    from: "responsive-audit VIEWPORTS",
  },
  {
    label: "pages in the audit",
    pattern: /viewports\s+and\s+(\d+)\s+pages\b/gi,
    actual: arrayLength(auditSource, "PAGES"),
    from: "responsive-audit PAGES",
  },
  {
    label: "Lighthouse routes",
    pattern: /\b(\d+|thirteen|twelve|eleven)\s+routes\b/gi,
    actual: arrayLength(lighthouseSource, "ROUTES"),
    from: "lighthouse ROUTES",
  },
  {
    label: "AR asset pairs",
    pattern: /\b(\d+)\s+AR asset pairs\b/gi,
    actual: artworks.length * 4,
    from: `${artworks.length} artworks x 4 sizes`,
  },
];

/** Written-out numbers appear in this prose as often as digits do. */
const WORD_NUMBERS = { eleven: 11, twelve: 12, thirteen: 13 };

const badCounts = new Map();
for (const claim of CLAIMS) {
  if (!claim.actual) {
    throw new Error(
      `Could not count ${claim.from} — the list was renamed or reshaped, so this check ` +
        `would pass without checking anything.`,
    );
  }
  for (const file of docFiles) {
    const text = await readFile(file, "utf8");
    for (const match of text.matchAll(claim.pattern)) {
      const claimed = WORD_NUMBERS[match[1].toLowerCase()] ?? Number(match[1]);
      if (claimed === claim.actual) continue;
      const key = `"${match[0].trim()}" — there are ${claim.actual} ${claim.label} (${claim.from})`;
      if (!badCounts.has(key)) badCounts.set(key, new Set());
      badCounts.get(key).add(path.relative(ROOT, file).replace(/\\/g, "/"));
    }
  }
}

console.log(
  `Checked ${files.length} files against ${validArtworks.size} artworks and ${validCollections.size} collections,\n` +
    `and ${docFiles.length} docs against ${validTitles.size} titles, the formats on disk and ` +
    `${CLAIMS.length} counted claims.`,
);

if (stale.size === 0 && staleTitles.size === 0 && badPaths.size === 0 && badCounts.size === 0) {
  console.log("RESULT: PASS — every referenced slug, title, file format and count holds.");
  process.exit(0);
}

for (const [key, where] of badCounts) {
  console.error(`  ${key} — claimed in ${[...where].join(", ")}`);
}

for (const [key, where] of badPaths) {
  console.error(`  ${key} — named in ${[...where].join(", ")}`);
}

for (const [key, where] of staleTitles) {
  console.error(`  ${key} — named in ${[...where].join(", ")}`);
}

for (const [key, where] of stale) {
  console.error(`  ${key} — referenced by ${[...where].join(", ")}`);
}
console.error(
  "\nRESULT: FAIL — these are missing from the catalogue, name a format the pipeline " +
    "does not read, or state a count that has moved.",
);
process.exit(1);
