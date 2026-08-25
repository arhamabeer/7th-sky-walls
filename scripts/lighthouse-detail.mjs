/**
 * Reads a saved Lighthouse report and prints what is actually costing time:
 * the metric breakdown, the biggest opportunities, and any failed audits in
 * the gated categories.
 *
 * Usage: node scripts/lighthouse-detail.mjs [reportName]
 *   e.g. node scripts/lighthouse-detail.mjs mobile--home
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const DIR = path.resolve(import.meta.dirname, "..", ".lighthouse");
const name = process.argv[2];

if (!name) {
  const files = await readdir(DIR).catch(() => []);
  console.log("Available reports:\n" + files.map((f) => `  ${f.replace(/\.json$/, "")}`).join("\n"));
  process.exit(0);
}

const lhr = JSON.parse(await readFile(path.join(DIR, `${name}.json`), "utf8"));

console.log(`${name} — ${lhr.finalDisplayedUrl}\n`);

console.log("Scores");
for (const [id, c] of Object.entries(lhr.categories)) {
  console.log(`  ${id.padEnd(16)}${Math.round((c.score ?? 0) * 100)}`);
}

console.log("\nMetrics");
for (const id of [
  "first-contentful-paint",
  "largest-contentful-paint",
  "total-blocking-time",
  "cumulative-layout-shift",
  "speed-index",
  "interactive",
]) {
  const audit = lhr.audits[id];
  if (audit) {
    console.log(
      `  ${id.padEnd(28)}${String(audit.displayValue ?? "-").padEnd(12)}score ${Math.round((audit.score ?? 0) * 100)}`,
    );
  }
}

const lcpElement = lhr.audits["largest-contentful-paint-element"];
if (lcpElement?.details?.items?.length) {
  const node = lcpElement.details.items[0]?.items?.[0]?.node;
  if (node) console.log(`\nLCP element: ${node.snippet?.slice(0, 120)}`);
}

console.log("\nOpportunities and diagnostics with room to improve");
const notable = Object.values(lhr.audits)
  .filter(
    (a) =>
      a.score !== null &&
      a.score < 0.95 &&
      (a.details?.type === "opportunity" || a.details?.type === "table") &&
      a.scoreDisplayMode !== "informative",
  )
  .sort((a, b) => (a.score ?? 1) - (b.score ?? 1));

for (const audit of notable.slice(0, 12)) {
  const saving = audit.details?.overallSavingsMs
    ? ` (~${Math.round(audit.details.overallSavingsMs)}ms)`
    : "";
  console.log(`  [${Math.round((audit.score ?? 0) * 100)}] ${audit.title}${saving}`);
  for (const item of (audit.details?.items ?? []).slice(0, 3)) {
    const label = item.url ?? item.node?.snippet ?? item.source?.url ?? "";
    if (label) console.log(`        ${String(label).slice(0, 110)}`);
  }
}

console.log("\nFailed audits in gated categories");
for (const category of ["seo", "best-practices", "accessibility"]) {
  const refs = lhr.categories[category]?.auditRefs ?? [];
  const failed = refs
    .map((r) => lhr.audits[r.id])
    .filter((a) => a && a.score !== null && a.score < 1);
  if (failed.length) {
    console.log(`  ${category}:`);
    for (const a of failed) {
      console.log(`      ${a.id}: ${a.title}`);
      for (const item of (a.details?.items ?? []).slice(0, 3)) {
        const label = item.node?.snippet ?? item.url ?? "";
        if (label) console.log(`          ${String(label).slice(0, 110)}`);
      }
    }
  }
}
