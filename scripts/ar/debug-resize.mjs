/** Traces what happens to the AR model when the selected size changes. */
import { chromium } from "playwright";

const BASE = process.argv[2] || "http://localhost:4020";
const WIDTH = Number(process.argv[3]) || 1280;
const HEIGHT = Number(process.argv[4]) || 900;
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: WIDTH, height: HEIGHT },
  hasTouch: WIDTH < 1024,
  isMobile: WIDTH < 768,
});
page.on("pageerror", (e) => console.log("PAGEERROR:", String(e).slice(0, 200)));
page.on("console", (m) => {
  if (m.type() === "error") console.log("CONSOLE ERROR:", m.text().slice(0, 200));
});

await page.goto(`${BASE}/portfolio/sabr`, { waitUntil: "networkidle" });
await page.locator("[role=tab]", { hasText: "On your wall" }).click();
await page.waitForFunction(() => Boolean(document.querySelector("model-viewer")), undefined, {
  timeout: 20000,
});

const snapshot = () =>
  page.evaluate(() => {
    const mv = document.querySelector("model-viewer");
    return {
      srcAttr: mv?.getAttribute("src"),
      srcProp: mv?.src,
      currentSrc: mv?.currentSrc,
      loaded: mv?.loaded,
      ios: mv?.getAttribute("ios-src"),
      live: document.querySelector("[aria-live=polite]")?.textContent?.trim().slice(0, 46),
      pressed: [...document.querySelectorAll("main button[aria-pressed=true]")].map((b) =>
        b.textContent.trim().slice(0, 22),
      ),
      selectedTab: document.querySelector("[role=tab][aria-selected=true]")?.textContent.trim(),
      url: location.search,
    };
  });

console.log("BEFORE:", JSON.stringify(await snapshot(), null, 2));

const sizeButtons = await page.evaluate(() =>
  [...document.querySelectorAll("main button")]
    .map((b) => ({ text: b.textContent.trim().slice(0, 26), pressed: b.getAttribute("aria-pressed") }))
    .filter((b) => /^(Small|Medium|Large|Extra)/.test(b.text)),
);
console.log("SIZE BUTTONS:", JSON.stringify(sizeButtons));

await page.locator("main button", { hasText: /^Small/ }).first().click();
await page.waitForTimeout(1500);

console.log("AFTER:", JSON.stringify(await snapshot(), null, 2));
await browser.close();
