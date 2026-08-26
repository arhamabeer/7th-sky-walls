import { chromium } from "playwright";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const BASE = process.argv[2] || "http://localhost:4010";

/**
 * Refuse to run against a server that is not serving the build on disk.
 *
 * Learned twice now, both times expensively: a background server left over from
 * an earlier run answers the readiness poll instantly, the checks run against
 * yesterday's markup, and the failures they report are for code that no longer
 * exists. Next embeds the build id in every page, so one fetch settles it.
 */
async function assertFreshBuild() {
  if (!existsSync(".next/BUILD_ID")) return;
  const expected = readFileSync(".next/BUILD_ID", "utf8").trim();
  const html = await fetch(`${BASE}/`).then((r) => r.text());
  if (!html.includes(expected)) {
    console.error(
      `The server at ${BASE} is not serving build ${expected}.\n` +
        `Something older is holding the port — stop it and start the server again.`,
    );
    process.exit(2);
  }
  console.log(`Serving build ${expected}.`);
}
await assertFreshBuild();
const OUT = process.argv[3] || ".";
const PX_PER_MM = 96 / 25.4;
const mm = (px) => Math.round((px / PX_PER_MM) * 100) / 100;

const CASES = [
  { slug: "sabr", mode: "spec", paper: "a4", size: "l" },
  { slug: "sabr", mode: "corners", paper: "a4", size: "l" },
  { slug: "sabr", mode: "full", paper: "a4", size: "s" },
  { slug: "ask-better-questions", mode: "spec", paper: "a4", size: "xl" },
  { slug: "ask-better-questions", mode: "full", paper: "a4", size: "s" },
  { slug: "ask-better-questions", mode: "corners", paper: "letter", size: "m" },
  // A short word in the middle of a square: 29 of its 35 tiles are blank.
  { slug: "name-in-gold", mode: "full", paper: "a4", size: "l" },
];

let fails = 0;
const fail = (m) => {
  fails += 1;
  console.log(`  FAIL  ${m}`);
};
const ok = (m) => console.log(`  ok    ${m}`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const consoleErrors = [];
page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
page.on("pageerror", (e) => consoleErrors.push(String(e)));

for (const c of CASES) {
  const url = `${BASE}/portfolio/${c.slug}/template?mode=${c.mode}&paper=${c.paper}&size=${c.size}`;
  console.log(`\n${c.slug} · ${c.mode} · ${c.paper} · ${c.size}`);
  const res = await page.goto(url, { waitUntil: "networkidle" });
  if (res.status() !== 200) fail(`status ${res.status()}`);

  // --- print media: the geometry that actually reaches paper ---
  await page.emulateMedia({ media: "print" });

  const geo = await page.evaluate(() => {
    const sheets = [...document.querySelectorAll(".tpl-sheet")];
    const first = sheets[0];
    const inset = first.querySelector(".tpl-inset");
    const ruler = first.querySelector(".tpl-ruler");
    const chromeVisible = [...document.querySelectorAll("[data-site-chrome], [data-print-hide]")]
      .filter((el) => getComputedStyle(el).display !== "none").length;
    // Anything inside a sheet that pokes outside its printable inset — with the
    // exception of anything a clipping ancestor already contains. The tiled mode
    // lays the whole piece out inside each sheet's window and lets `overflow:
    // hidden` cut it down to that sheet's slice, so on a 14-sheet template
    // thirteen of them legitimately have the piece hanging off every edge.
    const insetBox = inset.getBoundingClientRect();
    const clipped = (el) => {
      for (let a = el.parentElement; a && a !== inset; a = a.parentElement) {
        const o = getComputedStyle(a);
        if (o.overflow !== "visible" || o.overflowX !== "visible") return true;
      }
      return false;
    };
    const overflow = [];
    for (const el of inset.querySelectorAll("*")) {
      const b = el.getBoundingClientRect();
      if (b.width === 0 && b.height === 0) continue;
      if (clipped(el)) continue;
      if (
        b.left < insetBox.left - 1 ||
        b.top < insetBox.top - 1 ||
        b.right > insetBox.right + 1 ||
        b.bottom > insetBox.bottom + 1
      ) {
        overflow.push(
          `${el.tagName}.${(el.getAttribute("class") ?? "").slice(0, 30)} ` +
            `[${Math.round(b.left - insetBox.left)},${Math.round(b.top - insetBox.top)} ` +
            `${Math.round(b.right - insetBox.right)},${Math.round(b.bottom - insetBox.bottom)}]`,
        );
      }
    }
    // Content taller than the printable area is content the sheet's own
    // overflow:hidden throws away without saying so — which is how a scale
    // drawing lost its bottom third and still looked plausible on screen.
    const clippedAway = sheets.map((s, i) => {
      const box = s.querySelector(".tpl-inset");
      const over = box.scrollHeight - box.clientHeight;
      return over > 1 ? `sheet ${i + 1}: ${over}px of content cut off` : null;
    }).filter(Boolean);

    return {
      count: sheets.length,
      sheet: { w: first.getBoundingClientRect().width, h: first.getBoundingClientRect().height },
      inset: { w: insetBox.width, h: insetBox.height },
      ruler: ruler ? ruler.getBoundingClientRect().width : null,
      chromeVisible,
      clippedAway,
      overflow: overflow.slice(0, 6),
      pageRule: [...document.styleSheets]
        .flatMap((s) => {
          try {
            return [...s.cssRules];
          } catch {
            return [];
          }
        })
        .filter((r) => r.constructor.name === "CSSPageRule")
        .map((r) => r.style.getPropertyValue("size")),
    };
  });

  const paperMm =
    c.paper === "a4" ? { w: 210, h: 297 } : { w: 215.9, h: 279.4 };
  const sw = mm(geo.sheet.w);
  const sh = mm(geo.sheet.h);
  const portrait = sw < sh;
  const expW = portrait ? paperMm.w : paperMm.h;
  const expH = portrait ? paperMm.h : paperMm.w;
  if (Math.abs(sw - expW) > 0.5 || Math.abs(sh - expH) > 0.5) {
    fail(`sheet is ${sw}x${sh}mm, expected ${expW}x${expH}mm`);
  } else ok(`sheet ${sw}x${sh}mm (${portrait ? "portrait" : "landscape"})`);

  if (Math.abs(mm(geo.inset.w) - (expW - 20)) > 0.5 || Math.abs(mm(geo.inset.h) - (expH - 20)) > 0.5) {
    fail(`printable area ${mm(geo.inset.w)}x${mm(geo.inset.h)}mm, expected ${expW - 20}x${expH - 20}`);
  } else ok(`printable ${mm(geo.inset.w)}x${mm(geo.inset.h)}mm`);

  const rulerMm = mm(geo.ruler);
  if (Math.abs(rulerMm - 100) > 0.4) fail(`calibration bar is ${rulerMm}mm, must be 100mm`);
  else ok(`calibration bar ${rulerMm}mm`);

  if (geo.chromeVisible > 0) fail(`${geo.chromeVisible} chrome element(s) still visible in print`);
  else ok("site chrome hidden in print");

  if (geo.overflow.length) {
    fail(`${geo.overflow.length} element(s) outside the printable area:`);
    for (const o of geo.overflow) console.log(`          ${o}`);
  } else ok("nothing outside the printable area");

  if (geo.clippedAway.length) {
    fail(`content cut off by the sheet edge:`);
    for (const o of geo.clippedAway) console.log(`          ${o}`);
  } else ok("no content cut off by the sheet edge");

  if (!geo.pageRule.some((s) => s.includes("mm"))) fail(`@page size not set (${geo.pageRule})`);
  else ok(`@page ${geo.pageRule[0]}`);

  console.log(`  info  ${geo.count} sheet(s) rendered`);

  // --- the real proof: a PDF, whose page boxes come from @page ---
  const pdfPath = `${OUT}/template-${c.slug}-${c.mode}-${c.paper}-${c.size}.pdf`;
  await page.pdf({ path: pdfPath, preferCSSPageSize: true, printBackground: true });
  const bytes = await import("node:fs").then((fs) => fs.readFileSync(pdfPath));
  const text = bytes.toString("latin1");
  const boxes = [...text.matchAll(/\/MediaBox\s*\[\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\]/g)];
  const pages = (text.match(/\/Type\s*\/Page[^s]/g) || []).length;
  if (boxes.length === 0) fail("PDF has no MediaBox");
  else {
    // PDF points: 1pt = 1/72in = 0.352778mm
    const wPt = parseFloat(boxes[0][3]) - parseFloat(boxes[0][1]);
    const hPt = parseFloat(boxes[0][4]) - parseFloat(boxes[0][2]);
    const wMm = Math.round(wPt * 0.352778 * 10) / 10;
    const hMm = Math.round(hPt * 0.352778 * 10) / 10;
    if (Math.abs(wMm - expW) > 0.6 || Math.abs(hMm - expH) > 0.6) {
      fail(`PDF page is ${wMm}x${hMm}mm, expected ${expW}x${expH}mm`);
    } else ok(`PDF page ${wMm}x${hMm}mm`);
  }
  if (pages !== geo.count) fail(`PDF has ${pages} pages, ${geo.count} sheets rendered`);
  else ok(`PDF ${pages} page(s), one per sheet`);

  /**
   * Blank sheets must not print, and the count must be honest.
   *
   * A piece is cut letters on a bare wall, so a short word leaves large empty
   * margins and tiling the rectangle printed them as blank sheets — 31% of them
   * across the catalogue, and 29 of 35 for Name in Gold.
   *
   * What matters as much as the saving is that the number on the button is the
   * number that comes out of the printer. A count computed in two places is a
   * count that will eventually disagree with itself, which is exactly what
   * happened while this was being built: the chip advertised the unfiltered grid
   * while the button beside it printed the filtered set.
   */
  if (c.mode === "full") {
    const counts = await page.evaluate(() => {
      const chip = [...document.querySelectorAll("main a")]
        .map((a) => a.textContent.replace(/\s+/g, " "))
        .find((t) => /Full template/.test(t));
      const advertised = Number(String(chip).match(/(\d+)\s*sheets?/)?.[1] ?? 0);
      const labels = [...document.querySelectorAll(".tpl-sheet p")].map((n) => n.textContent);
      const joined = labels.join(" ").replace(/\s+/g, " ");
      const grid = joined.match(/Row \d+ of (\d+) . Column \d+ of (\d+)/);
      return {
        advertised,
        rendered: document.querySelectorAll(".tpl-sheet").length,
        omitted: Number(joined.match(/(\d+) blank sheets omitted/)?.[1] ?? 0),
        gridTotal: grid ? Number(grid[1]) * Number(grid[2]) : 0,
      };
    });

    if (counts.advertised !== counts.rendered) {
      fail(
        `the button advertises ${counts.advertised} sheets but ${counts.rendered} render — ` +
          `the count is being worked out twice`,
      );
    } else ok(`the advertised count is the printed count (${counts.rendered})`);

    // Whatever was left out has to add back up to the grid, or something other
    // than blank margins is being dropped.
    if (counts.gridTotal > 0 && counts.rendered + counts.omitted !== counts.gridTotal) {
      fail(
        `${counts.rendered} printed plus ${counts.omitted} omitted is not the ` +
          `${counts.gridTotal}-tile grid — sheets are going missing unaccounted for`,
      );
    } else {
      ok(
        `printed and omitted account for the whole grid (${counts.rendered} + ${counts.omitted} of ${counts.gridTotal})`,
      );
    }
  }

  // --- the tiled template has to actually carry the piece ---
  //
  // Worth asserting rather than eyeballing: the first sheet of a portrait piece
  // is legitimately blank, because the lettering is centred and the top band of
  // the artwork is empty. So "sheet 1 looks empty" proves nothing either way, and
  // a template that was blank on every sheet would look exactly the same.
  if (c.mode === "full") {
    let inked = 0;
    let area = 0;
    for (const el of await page.$$(".tpl-sheet")) {
      const shot = await el.screenshot();
      const { data, info } = await sharp(shot).greyscale().raw().toBuffer({ resolveWithObject: true });
      area += info.width * info.height;
      for (let i = 0; i < data.length; i += 1) if (data[i] < 200) inked += 1;
    }
    const coverage = (inked / area) * 100;
    // 2%, chosen from measurements rather than taste. With the artwork made
    // invisible, the trim rules and labels alone cover 0.47-0.48%; the two real
    // cases here cover 7.0% and 26.6%. Anything between those is a template
    // that lost its piece.
    if (coverage < 2) {
      fail(`the tiled sheets are effectively blank (${coverage.toFixed(2)}% inked)`);
    } else ok(`piece present across the tiles (${coverage.toFixed(1)}% inked)`);
  }

  // --- screen: the preview has to be usable too ---
  await page.emulateMedia({ media: "screen" });
  const screen = await page.evaluate(() => {
    const s = document.querySelector(".tpl-sheet").getBoundingClientRect();
    return {
      w: s.width,
      h: s.height,
      docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  if (screen.docOverflow > 1) fail(`page scrolls horizontally by ${screen.docOverflow}px`);
  else ok("no horizontal scroll on screen");
  const ratio = screen.w / screen.h;
  const expRatio = expW / expH;
  if (Math.abs(ratio - expRatio) > 0.01) {
    fail(`screen preview aspect ${ratio.toFixed(3)}, expected ${expRatio.toFixed(3)}`);
  } else ok(`screen preview aspect ${ratio.toFixed(3)}`);

  await page.screenshot({ path: `${OUT}/tpl-${c.slug}-${c.mode}-${c.size}-screen.png`, fullPage: false });
}

// print-media screenshots of one sheet of each mode, for eyeballing
await page.emulateMedia({ media: "print" });
for (const c of CASES.slice(0, 3)) {
  await page.goto(
    `${BASE}/portfolio/${c.slug}/template?mode=${c.mode}&paper=${c.paper}&size=${c.size}`,
    { waitUntil: "networkidle" },
  );
  const el = await page.$(".tpl-sheet");
  await el.screenshot({ path: `${OUT}/tpl-${c.mode}-print.png` });
}

if (consoleErrors.length) {
  fails += consoleErrors.length;
  console.log(`\nConsole errors:`);
  for (const e of consoleErrors.slice(0, 8)) console.log(`  ${e}`);
}

await browser.close();
console.log(`\n${fails === 0 ? "RESULT: PASS" : `RESULT: FAIL — ${fails} problem(s)`}`);
writeFileSync(`${OUT}/.template-check`, String(fails));
process.exit(fails === 0 ? 0 : 1);
