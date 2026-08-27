/**
 * One-command verification loop: production build, serve it, run the
 * responsive audit across the device matrix, then tear down.
 *
 * Auditing the production build (not the dev server) matters — dev mode's
 * Fast Refresh state produces hydration warnings that do not exist in
 * production, and dev bundles differ from what users receive.
 *
 * The port is force-freed before starting, and the served build is
 * fingerprinted and compared against the one just built. Both guards exist
 * because a leftover server silently serving a stale build makes every
 * subsequent audit meaningless.
 *
 * Usage:
 *   node scripts/verify.mjs                 # build + audit everything
 *   node scripts/verify.mjs --skip-build    # reuse the existing build
 *   node scripts/verify.mjs --only mobile   # limit the viewport matrix
 *   node scripts/verify.mjs --shots         # save screenshots to .audit/
 */
import { spawnSync } from "node:child_process";
import { ROOT, startProductionServer } from "./lib/server.mjs";

const args = process.argv.slice(2);
const PORT = Number(process.env.VERIFY_PORT) || 4010;
const passThrough = args.filter((a) => a !== "--skip-build");

function run(cmd, cmdArgs) {
  return spawnSync(cmd, cmdArgs, { stdio: "inherit", shell: true, cwd: ROOT }).status ?? 1;
}

// --- 1. Guard: declared image dimensions must match the files on disk. ----
console.log("→ Checking artwork image dimensions...");
if (run("node", ["scripts/check-image-dims.mjs"]) !== 0) {
  console.error(
    "Image dimensions do not match artworks.json. Run `npm run generate:placeholders`\n" +
      "(or correct the declared width/height) before auditing.",
  );
  process.exit(1);
}

// --- 2. Build. ------------------------------------------------------------
if (!args.includes("--skip-build")) {
  console.log("→ Building production bundle...");
  const code = run("npx", ["next", "build"]);
  if (code !== 0) {
    console.error("Build failed — aborting verification.");
    process.exit(code);
  }
}

// --- 3. Serve, and prove we are auditing the build we just made. ---------
let server;
try {
  server = await startProductionServer(PORT);
} catch (err) {
  console.error(String(err instanceof Error ? err.message : err));
  process.exit(1);
}
const shutdown = server.stop;

// --- 4. Hero arrangement. -------------------------------------------------
// The hero wall is hand-tuned percentages and each frame's height depends on
// its artwork's aspect, so changing which pieces are featured can silently
// make two frames collide.
console.log("→ Checking the hero wall arrangement...");
const heroCode = run("node", ["scripts/check-hero-layout.mjs", `http://localhost:${PORT}`]);

// --- 5. Printable templates. ---------------------------------------------
// Measured in print media, where nothing else in this pipeline looks: sheet and
// page-box sizes in millimetres, the calibration bar's exact length, and the page
// count of a generated PDF. A template that is silently 6% small is worse than no
// template, because it is confidently wrong.
console.log("→ Checking the printable templates...");
// No output directory: the check's own default is `.print/`, and passing
// `.audit` here put the PDFs somewhere different depending on how the check was
// started, which is the kind of thing that has you hunting for a file twice.
const printCode = run("node", [
  "scripts/check-print-template.mjs",
  `http://localhost:${PORT}`,
]);

// --- 6. Image sizing. ----------------------------------------------------
// Whether every image is fetched at close to the size it is painted. `sizes` is
// a string no type checker reads, and when a layout changes underneath one the
// only symptom is bytes — 195 of 289 images were over-fetching, by up to 61x.
console.log("→ Checking image sizing...");
const sizesCode = run("node", [
  "scripts/check-image-sizes.mjs",
  `http://localhost:${PORT}`,
]);

// --- 7. SEO facts. --------------------------------------------------------
// Lighthouse scores SEO 100 on every route and never asks whether a canonical
// points at its own page, whether the sitemap lists the pages that exist, or
// whether two pages claim the same title. Those are the failures that cost
// rankings silently — and the sitemap is generated from the same content the
// pages are, so a new route type without a sitemap entry is drift waiting.
console.log("→ Checking the SEO facts Lighthouse does not...");
const seoCode = run("node", ["scripts/check-seo.mjs", `http://localhost:${PORT}`]);

// --- 8. Audit. ------------------------------------------------------------
const auditCode = run("node", [
  "scripts/responsive-audit.mjs",
  "--url",
  `http://localhost:${PORT}`,
  ...passThrough,
]);

shutdown();
process.exit(auditCode || heroCode || printCode || sizesCode || seoCode);
