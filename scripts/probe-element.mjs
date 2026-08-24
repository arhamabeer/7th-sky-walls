/**
 * Measures specific elements in a live page, for diagnosing layout findings
 * from the responsive audit.
 *
 * Usage: node scripts/probe-element.mjs <baseUrl> <path> <cssSelector> [width]
 */
import { chromium } from "playwright";

const [, , base = "http://localhost:4010", pagePath = "/", selector = "a", width = "1024"] =
  process.argv;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: Number(width), height: 1200 },
  hasTouch: true,
});
await page.goto(base.replace(/\/$/, "") + pagePath, { waitUntil: "networkidle" });

const results = await page.evaluate((sel) => {
  return [...document.querySelectorAll(sel)].slice(0, 10).map((el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return {
      text: (el.textContent || "").trim().slice(0, 40),
      rect: { w: Math.round(r.width), h: Math.round(r.height) },
      display: s.display,
      minHeight: s.minHeight,
      height: s.height,
      alignItems: s.alignItems,
      lineHeight: s.lineHeight,
      fontSize: s.fontSize,
      className: typeof el.className === "string" ? el.className : "",
    };
  });
}, selector);

console.log(JSON.stringify(results, null, 2));
await browser.close();
