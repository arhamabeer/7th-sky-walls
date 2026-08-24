/**
 * Placeholder artwork generator.
 *
 * Renders one stylized JPEG per artwork in src/content/artworks.json
 * (deterministic per slug, styled per collection), a tiny base64 blur
 * placeholder map (src/content/blur.json), and PNG app icons from the
 * brand mark. Re-run any time: `node scripts/generate-placeholders.mjs`.
 *
 * These images are stand-ins until real artwork photography lands — the
 * swap is: drop real files at the same /public/artworks/<slug>.jpg paths
 * and re-run this script with --blur-only to refresh blur placeholders.
 */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_DIR = path.join(ROOT, "public", "artworks");
const BRAND_DIR = path.join(ROOT, "public", "brand");
const OG_DIR = path.join(ROOT, "public", "og");
const BLUR_ONLY = process.argv.includes("--blur-only");

/** Escape text for inclusion in SVG markup. */
const xml = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c],
  );

/** Deterministic PRNG seeded from a string. */
function rng(seedStr) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const between = (r, min, max) => min + r() * (max - min);

const PALETTES = {
  "skyline-geometry": { bg: "#F4EFE6", shapes: ["#33506B", "#C8A971", "#191510", "#8F6830", "#5B748C"] },
  "sacred-lines": { bg: "#FAF6EE", shapes: ["#191510", "#8F6830", "#33506B"] },
  "botanical-fields": { bg: "#F2F1E8", shapes: ["#3E5C46", "#6D8B5E", "#2C4434", "#9DB380", "#C8A971"] },
  "heritage-arches": { bg: "#F1E9DC", shapes: ["#8A6A4B", "#5C4632", "#B08D62", "#33506B", "#40342A"] },
  "chromatic-drift": { bg: "#EFEBE2", shapes: ["#33506B", "#C8A971", "#7A9BB5", "#B76E4E", "#274058"] },
  "words-at-work": { bg: "#F6F2EA", shapes: ["#191510", "#33506B", "#8F6830"] },
};

function svgHeader(w, h, bg) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${bg}"/>`;
}

function skylineGeometry(r, w, h, p) {
  let s = "";
  const n = 6 + Math.floor(r() * 4);
  for (let i = 0; i < n; i++) {
    const x = between(r, -w * 0.2, w * 0.9);
    const y = between(r, h * 0.1, h * 0.85);
    const bw = between(r, w * 0.15, w * 0.55);
    const bh = between(r, h * 0.08, h * 0.4);
    const rot = between(r, -18, 18);
    const color = pick(r, p.shapes);
    const op = between(r, 0.55, 0.95).toFixed(2);
    s += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="${color}" opacity="${op}" transform="rotate(${rot.toFixed(1)} ${x + bw / 2} ${y + bh / 2})"/>`;
  }
  s += `<line x1="0" y1="${h * 0.72}" x2="${w}" y2="${h * 0.66}" stroke="${p.shapes[1]}" stroke-width="${w * 0.006}"/>`;
  return s;
}

function sacredLines(r, w, h, p) {
  let s = "";
  const strokes = 3 + Math.floor(r() * 3);
  for (let i = 0; i < strokes; i++) {
    const x0 = between(r, w * 0.15, w * 0.4);
    const y0 = between(r, h * 0.2, h * 0.5);
    const c1x = between(r, w * 0.2, w * 0.9);
    const c1y = between(r, h * 0.05, h * 0.9);
    const c2x = between(r, w * 0.1, w * 0.8);
    const c2y = between(r, h * 0.1, h * 0.95);
    const x1 = between(r, w * 0.55, w * 0.9);
    const y1 = between(r, h * 0.5, h * 0.85);
    const width = between(r, w * 0.015, w * 0.05);
    const color = i === 0 ? p.shapes[0] : pick(r, p.shapes);
    s += `<path d="M ${x0} ${y0} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x1} ${y1}" stroke="${color}" stroke-width="${width}" fill="none" stroke-linecap="round" opacity="${between(r, 0.75, 1).toFixed(2)}"/>`;
  }
  s += `<circle cx="${w * between(r, 0.6, 0.8)}" cy="${h * between(r, 0.18, 0.3)}" r="${w * 0.02}" fill="${p.shapes[1]}"/>`;
  return s;
}

function botanicalFields(r, w, h, p) {
  let s = "";
  const leaves = 8 + Math.floor(r() * 7);
  for (let i = 0; i < leaves; i++) {
    const cx = between(r, 0, w);
    const cy = between(r, 0, h);
    const rx = between(r, w * 0.06, w * 0.22);
    const ry = rx * between(r, 2, 3.4);
    const rot = between(r, 0, 360);
    const color = pick(r, p.shapes);
    s += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${color}" opacity="${between(r, 0.35, 0.8).toFixed(2)}" transform="rotate(${rot.toFixed(0)} ${cx} ${cy})"/>`;
  }
  return s;
}

function heritageArches(r, w, h, p) {
  let s = "";
  const cols = 3 + Math.floor(r() * 3);
  const aw = w / (cols + 1);
  for (let i = 0; i < cols; i++) {
    const x = aw * (i + 0.5) + between(r, -aw * 0.1, aw * 0.1);
    const top = between(r, h * 0.12, h * 0.3);
    const bottom = h * between(r, 0.85, 0.98);
    const color = pick(r, p.shapes);
    s += `<path d="M ${x} ${bottom} L ${x} ${top + aw * 0.45} A ${aw * 0.45} ${aw * 0.45} 0 0 1 ${x + aw * 0.9} ${top + aw * 0.45} L ${x + aw * 0.9} ${bottom} Z" fill="${color}" opacity="${between(r, 0.5, 0.9).toFixed(2)}"/>`;
  }
  return s;
}

function panoramicDrift(r, w, h, p) {
  // Panoramic canvases need horizontal emphasis; vertical gradients read as
  // flat bands at 5:2.
  const c1 = pick(r, p.shapes);
  let c2 = pick(r, p.shapes);
  if (c2 === c1) c2 = p.shapes[(p.shapes.indexOf(c1) + 1) % p.shapes.length];
  let s =
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0">` +
    `<stop offset="0" stop-color="${p.bg}"/><stop offset="0.45" stop-color="${c1}" stop-opacity="0.8"/><stop offset="1" stop-color="${c2}"/>` +
    `</linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/>`;
  const bands = 3 + Math.floor(r() * 3);
  for (let i = 0; i < bands; i++) {
    const y = between(r, h * 0.15, h * 0.85);
    s += `<rect y="${y}" width="${w}" height="${h * between(r, 0.02, 0.07)}" fill="${pick(r, p.shapes)}" opacity="${between(r, 0.3, 0.7).toFixed(2)}"/>`;
  }
  return s;
}

function chromaticDrift(r, w, h, p) {
  const c1 = pick(r, p.shapes);
  let c2 = pick(r, p.shapes);
  if (c2 === c1) c2 = p.shapes[(p.shapes.indexOf(c1) + 1) % p.shapes.length];
  const angle = pick(r, [0, 90, 45]);
  const x2 = angle === 90 ? 0 : 1;
  const y2 = angle === 0 ? 1 : angle === 45 ? 1 : 0;
  const mid = between(r, 0.35, 0.65).toFixed(2);
  return (
    `<defs><linearGradient id="g" x1="0" y1="0" x2="${x2}" y2="${y2}">` +
    `<stop offset="0" stop-color="${c1}"/><stop offset="${mid}" stop-color="${c2}" stop-opacity="0.85"/><stop offset="1" stop-color="${p.bg}"/>` +
    `</linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/>` +
    `<rect y="${h * between(r, 0.55, 0.75)}" width="${w}" height="${h * 0.008}" fill="#C8A971" opacity="0.9"/>`
  );
}

function wordsAtWork(r, w, h, p, title) {
  const words = title.replace(/[^A-Za-z. ]/g, "").split(/[\s.]+/).filter(Boolean);
  const color = p.shapes[0];
  // Bold serif caps advance at roughly 0.72em including letter-spacing. Fit the
  // longest word inside 78% of the width, then clamp so all lines fit vertically.
  const longest = Math.max(...words.map((x) => x.length));
  const size = Math.min(
    (w * 0.78) / (longest * 0.72),
    (h * 0.8) / (words.length * 1.18),
  );
  const lineH = size * 1.18;
  const startY = h / 2 - ((words.length - 1) * lineH) / 2;
  let s = `<rect x="${w * 0.06}" y="${h * 0.06}" width="${w * 0.88}" height="${h * 0.88}" fill="none" stroke="${pick(r, p.shapes)}" stroke-width="${w * 0.004}" opacity="0.5"/>`;
  words.forEach((word, i) => {
    s += `<text x="${w / 2}" y="${startY + i * lineH}" font-family="Georgia, 'Times New Roman', serif" font-size="${size}" font-weight="bold" fill="${color}" text-anchor="middle" dominant-baseline="middle" letter-spacing="${size * 0.06}">${word.toUpperCase()}</text>`;
  });
  return s;
}

const GENERATORS = {
  "skyline-geometry": skylineGeometry,
  "sacred-lines": sacredLines,
  "botanical-fields": botanicalFields,
  "heritage-arches": heritageArches,
  "chromatic-drift": chromaticDrift,
  "words-at-work": wordsAtWork,
};

/**
 * Social share card for one artwork, 1200x630.
 *
 * Generated at build time rather than rendered on request: the composition is
 * deterministic, it costs nothing at runtime, and every crawler gets a plain
 * static JPEG.
 *
 * Note: text is rasterised with the host's system fonts, so cards should be
 * regenerated on one machine and committed rather than built per environment.
 */
async function buildOgCard(art, collectionName, sourceFile, outFile) {
  const W = 1200;
  const H = 630;
  const IMG_W = Math.round(W * 0.56);
  const PANEL_X = IMG_W + 56;
  const PANEL_W = W - PANEL_X - 56;

  const image = await sharp(sourceFile)
    .resize(IMG_W, H, { fit: "cover", position: "attention" })
    .toBuffer();

  // Wrap the title to the panel width, roughly 15 characters per line at 54px.
  const words = String(art.title).split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > 16 && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  const titleLines = lines.slice(0, 3);

  const titleSize = titleLines.length > 2 ? 46 : 54;
  const titleTop = 250 - ((titleLines.length - 1) * titleSize * 1.16) / 2;

  const overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect x="${IMG_W}" y="0" width="${W - IMG_W}" height="${H}" fill="#FAF7F1"/>
    <rect x="${PANEL_X}" y="96" width="64" height="6" rx="3" fill="#8F6830"/>
    <text x="${PANEL_X}" y="150" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="20" font-weight="600" letter-spacing="3" fill="#8F6830">${xml(collectionName.toUpperCase())}</text>
    ${titleLines
      .map(
        (t, i) =>
          `<text x="${PANEL_X}" y="${titleTop + i * titleSize * 1.16}" font-family="Georgia, Times New Roman, serif" font-size="${titleSize}" fill="#191510">${xml(t)}</text>`,
      )
      .join("")}
    <text x="${PANEL_X}" y="${titleTop + titleLines.length * titleSize * 1.16 + 34}" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="22" fill="#6F675A">${xml(art.materials[0] ?? "")}</text>
    <rect x="${PANEL_X}" y="${H - 118}" width="${PANEL_W}" height="1" fill="#E7DFD1"/>
    <text x="${PANEL_X}" y="${H - 76}" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="22" font-weight="600" fill="#191510">Wall art for commercial spaces</text>
  </svg>`;

  await sharp({
    create: { width: W, height: H, channels: 3, background: "#FAF7F1" },
  })
    .composite([
      { input: image, left: 0, top: 0 },
      { input: Buffer.from(overlay), left: 0, top: 0 },
    ])
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(outFile);
}

async function main() {
  const artworks = JSON.parse(
    await readFile(path.join(ROOT, "src", "content", "artworks.json"), "utf8"),
  );
  const collections = JSON.parse(
    await readFile(path.join(ROOT, "src", "content", "collections.json"), "utf8"),
  );
  const collectionName = Object.fromEntries(collections.map((c) => [c.id, c.name]));

  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(BRAND_DIR, { recursive: true });
  await mkdir(OG_DIR, { recursive: true });

  const blur = {};
  for (const art of artworks) {
    const { width: w, height: h } = art.image;
    const file = path.join(ROOT, "public", art.image.src.replace(/^\//, ""));
    if (!BLUR_ONLY) {
      const p = PALETTES[art.collection] ?? PALETTES["chromatic-drift"];
      // Panoramic canvases get a horizontal treatment regardless of
      // collection — the standard generators assume a taller canvas.
      const gen =
        art.orientation === "panorama"
          ? panoramicDrift
          : (GENERATORS[art.collection] ?? chromaticDrift);
      const svg = svgHeader(w, h, p.bg) + gen(rng(art.slug), w, h, p, art.title) + "</svg>";
      await sharp(Buffer.from(svg)).jpeg({ quality: 80, mozjpeg: true }).toFile(file);
    }
    const tiny = await sharp(file).resize(20).jpeg({ quality: 40 }).toBuffer();
    blur[art.slug] = `data:image/jpeg;base64,${tiny.toString("base64")}`;

    await buildOgCard(
      art,
      collectionName[art.collection] ?? "",
      file,
      path.join(OG_DIR, `${art.slug}.jpg`),
    );

    console.log(`ok ${art.slug}`);
  }

  await writeFile(
    path.join(ROOT, "src", "content", "blur.json"),
    JSON.stringify(blur, null, 2) + "\n",
  );

  // App icons from the brand mark.
  const mark = path.join(BRAND_DIR, "mark.svg");
  for (const size of [192, 512]) {
    await sharp(mark, { density: 300 })
      .resize(size, size)
      .flatten({ background: "#FAF7F1" })
      .png()
      .toFile(path.join(BRAND_DIR, `icon-${size}.png`));
  }

  /**
   * Invalidate Next's optimized-image cache.
   *
   * next/image keys its cache on the request URL, and replacing an artwork
   * file in place leaves that URL unchanged — so the optimizer keeps serving
   * the previous pixels, at the previous aspect ratio. That produced a
   * letterboxed viewer after the sizes migration and would do the same the
   * first time real photography replaces a placeholder.
   */
  for (const dir of [
    path.join(ROOT, ".next", "cache", "images"),
    path.join(ROOT, ".next", "dev", "cache", "images"),
  ]) {
    await rm(dir, { recursive: true, force: true });
  }

  console.log(
    `done: ${artworks.length} artworks + blur map + icons (next/image cache cleared)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
