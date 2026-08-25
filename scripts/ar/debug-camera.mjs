/** Traces opening and closing the camera preview overlay. */
import { chromium } from "playwright";

const BASE = process.argv[2] || "http://localhost:4020";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("pageerror", (e) => console.log("PAGEERROR:", String(e).slice(0, 200)));
page.on("console", (m) => {
  if (m.type() === "error") console.log("CONSOLE:", m.text().slice(0, 200));
});

await page.goto(`${BASE}/portfolio/sabr`, { waitUntil: "networkidle" });
await page.locator("[role=tab]", { hasText: "On your wall" }).click();
await page.waitForFunction(() => Boolean(document.querySelector("model-viewer")), undefined, {
  timeout: 20000,
});

const snapshot = (label) =>
  page.evaluate((l) => {
    const dialogs = [...document.querySelectorAll("[role=dialog]")].map((d) => ({
      label: d.getAttribute("aria-label")?.slice(0, 50),
      modal: d.getAttribute("aria-modal"),
    }));
    return { l, dialogs, overflow: document.documentElement.style.overflow };
  }, label);

console.log("BEFORE:", JSON.stringify(await snapshot("before"), null, 1));

await page.locator("[role=tabpanel] button", { hasText: /camera/i }).first().click();
await page.waitForTimeout(900);
console.log("AFTER OPEN:", JSON.stringify(await snapshot("open"), null, 1));

// No explicit focus move — this mirrors what the test suite does, where the
// trigger button keeps focus behind the modal.
console.log(
  "FOCUS:",
  await page.evaluate(() => document.activeElement?.textContent?.trim().slice(0, 40)),
);
await page.keyboard.press("Escape");
await page.waitForTimeout(900);
console.log("AFTER ESCAPE:", JSON.stringify(await snapshot("escape"), null, 1));

// Try the explicit close control as a comparison.
const closeButton = page.locator("[role=dialog] button", { hasText: /^Close$/ });
if ((await closeButton.count()) > 0) {
  await closeButton.click();
  await page.waitForTimeout(700);
  console.log("AFTER CLOSE BUTTON:", JSON.stringify(await snapshot("close"), null, 1));
}

await browser.close();
