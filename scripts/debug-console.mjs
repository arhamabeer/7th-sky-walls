/**
 * Dumps full console errors and warnings, for diagnosing hydration mismatches
 * and other runtime issues the responsive audit only summarizes.
 *
 * Usage: node scripts/debug-console.mjs [baseUrl] [width] [path...]
 * With no paths, every route is checked.
 */
import { chromium } from "playwright";

const BASE = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const WIDTH = Number(process.argv[3]) || 1920;
const PATHS =
  process.argv.slice(4).length > 0
    ? process.argv.slice(4)
    : [
        "/",
        "/portfolio",
        "/portfolio?venue=hotel",
        "/portfolio/idea-bulb",
        "/portfolio/ask-better-questions",
        "/services",
        "/about",
        "/contact",
      ];

const browser = await chromium.launch();
let total = 0;

for (const p of PATHS) {
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: Math.round(WIDTH * 0.5625) },
  });
  const msgs = [];
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") msgs.push(`[${m.type()}] ${m.text()}`);
  });
  page.on("pageerror", (e) => msgs.push(`[pageerror] ${String(e)}`));

  await page.goto(BASE + p, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(2000);

  if (msgs.length) {
    total += msgs.length;
    console.log(`\n===== ${p} (${WIDTH}px) =====`);
    console.log(msgs.join("\n\n---\n\n"));
  }
  await page.close();
}

console.log(total ? `\n${total} message(s) found.` : `\nClean: no console errors or warnings across ${PATHS.length} routes at ${WIDTH}px.`);
await browser.close();
