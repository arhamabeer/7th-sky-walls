/**
 * Checks that no two pieces on the hero wall overlap or run off it.
 *
 * The arrangement is hand-tuned percentages, and each piece's height depends
 * on its artwork's aspect ratio — so changing which artworks are featured can
 * silently make two frames collide. This measures the rendered boxes instead
 * of trusting the numbers.
 *
 * Usage: node scripts/check-hero-layout.mjs [baseUrl]
 */
import { chromium } from "playwright";
import { assertServing } from "./lib/server.mjs";

const BASE = (process.argv[2] || "http://localhost:4020").replace(/\/$/, "");
/** Minimum gap between frames, in pixels, so the wall reads as hung not stacked. */
const MIN_GAP = 8;

/**
 * This gate had no idea what it was measuring, and its default port is the one
 * an ad-hoc `serve.mjs` uses — so a leftover server from an earlier session
 * would have had it confirming the hero wall of a build nobody was looking at.
 */
await assertServing(BASE);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);

const frames = await page.evaluate(() => {
  const wall = document.querySelector("#hero-wall [data-parallax]")?.parentElement;
  if (!wall) return null;
  const bounds = wall.getBoundingClientRect();
  return {
    wall: { w: bounds.width, h: bounds.height, top: bounds.top, left: bounds.left },
    boxes: [...wall.querySelectorAll("[data-parallax]")].map((el, i) => {
      const r = el.getBoundingClientRect();
      return {
        i,
        left: r.left - bounds.left,
        top: r.top - bounds.top,
        right: r.right - bounds.left,
        bottom: r.bottom - bounds.top,
      };
    }),
  };
});

if (!frames) {
  console.log("Hero wall not found at this viewport — it is hidden below lg.");
  await browser.close();
  process.exit(0);
}

const problems = [];

for (const box of frames.boxes) {
  if (box.top < -1 || box.left < -1) problems.push(`frame ${box.i} starts outside the wall`);
  if (box.bottom > frames.wall.h + 1)
    problems.push(
      `frame ${box.i} overflows the bottom by ${Math.round(box.bottom - frames.wall.h)}px`,
    );
  if (box.right > frames.wall.w + 1)
    problems.push(
      `frame ${box.i} overflows the right by ${Math.round(box.right - frames.wall.w)}px`,
    );
}

for (let a = 0; a < frames.boxes.length; a++) {
  for (let b = a + 1; b < frames.boxes.length; b++) {
    const A = frames.boxes[a];
    const B = frames.boxes[b];
    const overlapX = Math.min(A.right, B.right) - Math.max(A.left, B.left);
    const overlapY = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top);
    if (overlapX > -MIN_GAP && overlapY > -MIN_GAP) {
      problems.push(
        `frames ${a} and ${b} are closer than ${MIN_GAP}px (overlap ${Math.round(overlapX)}x${Math.round(overlapY)})`,
      );
    }
  }
}

console.log(`Hero wall: ${frames.boxes.length} frames in ${Math.round(frames.wall.w)}x${Math.round(frames.wall.h)}px`);
for (const box of frames.boxes) {
  console.log(
    `  frame ${box.i}: ${Math.round(box.left)},${Math.round(box.top)} → ${Math.round(box.right)},${Math.round(box.bottom)}`,
  );
}

await browser.close();

if (problems.length) {
  console.log(`\n${problems.length} problem(s):`);
  for (const p of problems) console.log(`  FAIL ${p}`);
  console.log("\nRESULT: FAIL\n");
  process.exit(1);
}
console.log("\nRESULT: PASS — every frame sits on the wall with clear space around it.\n");
