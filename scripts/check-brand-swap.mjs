/**
 * Brand configurability gate.
 *
 * The brief makes this non-negotiable: renaming the studio must mean editing
 * one config file, with no find-and-replace and nothing left behind. Grepping
 * for the current name proves only that the string is not hardcoded — it says
 * nothing about whether the layout survives a different one. It did not: a long
 * name wrapped to three lines inside a fixed-height header and crossed the
 * border onto the page, and the responsive audit passed it, because the audit
 * looks for horizontal overflow and this was vertical.
 *
 * So this swaps in a deliberately awkward brand — a 44-character name and a
 * different palette — rebuilds, and checks two things: that no trace of the
 * real brand survives anywhere in the output, and that the header still
 * contains its own contents at the narrowest widths. Then it puts the real
 * config back.
 *
 * Slow (two production builds), so it is not part of `npm run verify`. Run it
 * before launch and after any change to the header, footer or config shape.
 *
 * Usage: node scripts/check-brand-swap.mjs
 */
import { spawnSync } from "node:child_process";
import { copyFile, readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { ROOT, startProductionServer } from "./lib/server.mjs";

const PORT = Number(process.env.BRAND_SWAP_PORT) || 4030;
const CONFIG = path.join(ROOT, "src", "config", "site.config.ts");
const BACKUP = path.join(ROOT, "src", "config", ".site.config.backup");

const SWAP = {
  name: "The Metropolitan Mural & Calligraphy Atelier",
  url: "https://brand-swap-check.invalid",
  background: "#F5F7F6",
  accent: "#2F5D50",
};

/** Routes that between them render the header, footer, metadata and feeds. */
const ROUTES = [
  "/",
  "/portfolio",
  "/portfolio/meridian-seven",
  "/collections",
  "/spaces",
  "/spaces/office",
  "/planner",
  "/services",
  "/about",
  "/contact",
  "/no-such-page",
  "/sitemap.xml",
  "/robots.txt",
  "/manifest.webmanifest",
];

const NARROW = [320, 360, 393, 430];

const findings = [];
const fail = (message) => findings.push(message);

function build() {
  const { status } = spawnSync("npx", ["next", "build"], {
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
    cwd: ROOT,
  });
  return status === 0;
}

/**
 * Read the values this check needs to swap, so it reports honestly rather than
 * silently testing nothing when a field is renamed. That already happened once:
 * a replacement aimed at a `domain` field that is actually called `url` changed
 * nothing, and the run still looked like a pass.
 */
function currentValues(source) {
  const read = (key) => source.match(new RegExp(`${key}:\\s*"([^"]+)"`))?.[1];
  return { name: read("name"), url: read("url") };
}

async function main() {
  const original = await readFile(CONFIG, "utf8");
  const real = currentValues(original);
  if (!real.name || !real.url) {
    console.error("Could not read `name` and `url` from site.config.ts — has the shape changed?");
    process.exit(1);
  }
  console.log(`Real brand: ${real.name} at ${real.url}`);

  await copyFile(CONFIG, BACKUP);
  let restored = false;
  const restore = async () => {
    if (restored) return;
    restored = true;
    await copyFile(BACKUP, CONFIG);
    await unlink(BACKUP).catch(() => {});
  };
  process.on("SIGINT", () => {
    restore().finally(() => process.exit(130));
  });

  try {
    // Replace every occurrence of the name and origin rather than named
    // fields. The config holds the brand in more than one place — `legalName`
    // as well as `name` — and a check that swaps only the field it thought of
    // reports the other one as a leak in the app. Doing it by value also means
    // a field added later is covered without editing this script.
    const swapped = original
      .split(real.name)
      .join(SWAP.name)
      .split(real.url)
      .join(SWAP.url)
      .replace(/background:\s*"#[0-9A-Fa-f]{6}"/, `background: "${SWAP.background}"`)
      .replace(/accent:\s*"#[0-9A-Fa-f]{6}"/, `accent: "${SWAP.accent}"`);

    if (swapped.includes(real.name) || swapped.includes(real.url)) {
      fail("the real brand name or origin survived the swap inside site.config.ts");
    }

    for (const [label, value] of [
      ["name", SWAP.name],
      ["url", SWAP.url],
      ["background", SWAP.background],
      ["accent", SWAP.accent],
    ]) {
      if (!swapped.includes(value)) fail(`could not swap ${label} — the config shape has changed`);
    }
    if (findings.length) throw new Error("config swap failed");

    await writeFile(CONFIG, swapped);
    console.log(`→ Swapped in "${SWAP.name}" (${SWAP.name.length} chars) and a new palette`);

    console.log("→ Building with the swapped brand...");
    if (!build()) throw new Error("build failed with the swapped brand");

    const server = await startProductionServer(PORT);

    // --- 1. Nothing of the real brand may survive anywhere in the output. ---
    const realTokens = [real.name, real.url.replace(/^https?:\/\//, "")];
    for (const route of ROUTES) {
      const body = await fetch(server.url + route).then((r) => r.text());
      for (const token of realTokens) {
        if (body.toLowerCase().includes(token.toLowerCase())) {
          fail(`${route} still contains "${token}" after the swap`);
        }
      }
      if (!body.toLowerCase().includes(SWAP.name.toLowerCase()) && route.startsWith("/") && !route.includes(".")) {
        fail(`${route} does not render the new brand name`);
      }
    }

    // --- 2. The header must contain its own contents at narrow widths. ------
    const browser = await chromium.launch();
    for (const width of NARROW) {
      const ctx = await browser.newContext({ viewport: { width, height: 720 } });
      const page = await ctx.newPage();
      await page.goto(server.url + "/", { waitUntil: "networkidle" });
      const box = await page.locator("header").first().evaluate((header) => {
        const outer = header.getBoundingClientRect();
        let worst = 0;
        let offender = "";
        for (const child of header.querySelectorAll("*")) {
          const r = child.getBoundingClientRect();
          if (r.width === 0 && r.height === 0) continue;
          const spill = Math.max(outer.top - r.top, r.bottom - outer.bottom);
          if (spill > worst) {
            worst = spill;
            offender = `${child.tagName}.${(child.getAttribute("class") ?? "").slice(0, 40)}`;
          }
        }
        return {
          height: Math.round(outer.height),
          spill: Math.round(worst),
          offender,
          scrolls: header.scrollWidth > header.clientWidth,
        };
      });
      // A pixel or two is sub-pixel rounding; anything more is content outside
      // the bar, sitting over the page.
      if (box.spill > 2) {
        fail(`${width}px: header content overflows the bar by ${box.spill}px (${box.offender})`);
      }
      if (box.scrolls) fail(`${width}px: header scrolls horizontally`);
      console.log(
        `  ${width}px  header ${box.height}px  vertical spill ${box.spill}px  h-scroll ${box.scrolls}`,
      );
      await ctx.close();
    }
    await browser.close();
    server.stop();
  } finally {
    await restore();
    console.log("→ Restored the real brand config");
    console.log("→ Rebuilding with the real brand...");
    if (!build()) fail("rebuild with the real config failed — check the working tree");
  }

  if (findings.length) {
    console.error("\nBrand swap findings:");
    for (const f of findings) console.error(`  - ${f}`);
    console.error("\nRESULT: FAIL — renaming the studio would break the site.");
    process.exit(1);
  }
  console.log("\nRESULT: PASS — the brand is fully configurable and the layout survives a long name.");
}

await main();
