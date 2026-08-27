/**
 * Placeholder artwork generator.
 *
 * Renders one PNG per artwork in src/content/artworks.json (deterministic per
 * slug, styled per collection), a tiny base64 blur placeholder map
 * (src/content/blur.json), and PNG app icons from the brand mark. Re-run any
 * time: `node scripts/generate-placeholders.mjs`.
 *
 * PNG rather than JPEG because these pieces have alpha and no ground. The
 * studio's product is cut lettering mounted on a wall: there is no rectangular
 * substrate, so the image is the letters and the wall behind them belongs to
 * the room. The site paints each piece's specified wall tone behind it, and AR
 * puts it on the visitor's real wall. See lib/dimensional-art.mjs.
 *
 * These images are stand-ins until real installation photography lands. To swap
 * in real work, drop files at /public/artworks/<slug>.png and re-run with
 * --blur-only; the script picks them up, gives each a content-addressed
 * filename, and rewrites artworks.json to match. Use PNG with a transparent
 * ground — a photograph with its own wall in it will show as a rectangle on
 * every other wall the site puts it on.
 *
 * Filenames carry a hash of the image bytes because next/image keys its cache
 * on the request URL, and replacing a file in place leaves that URL unchanged
 * — so the optimizer and every browser that has been to the site keep serving
 * the previous pixels. That produced a letterboxed viewer after the sizes
 * migration. A query string is not an option: next/image rejects one on a
 * local source with HTTP 400, so the cache key has to be the filename.
 */
import { mkdir, readdir, readFile, rm, unlink, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import * as art_ from "./lib/dimensional-art.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_DIR = path.join(ROOT, "public", "artworks");
const BRAND_DIR = path.join(ROOT, "public", "brand");
const OG_DIR = path.join(ROOT, "public", "og");
const ARTWORKS_JSON = path.join(ROOT, "src", "content", "artworks.json");
const BLUR_ONLY = process.argv.includes("--blur-only");

/** Eight hex characters of SHA-256 — ample for distinguishing image revisions. */
const contentHash = (buffer) => createHash("sha256").update(buffer).digest("hex").slice(0, 8);

/**
 * Resolve the master file for an artwork, tolerating both shapes: a plain
 * `<slug>.png` that someone has just dropped in, and the hashed filename this
 * script emits. The plain name wins, so dropping a replacement is enough to
 * have it picked up. The prune pattern also matches `.jpg`, so the opaque
 * images this catalogue used before are cleared out rather than left orphaned.
 */
async function readMaster(slug, currentSrc) {
  const plain = path.join(OUT_DIR, `${slug}.png`);
  try {
    return { buffer: await readFile(plain), from: plain };
  } catch {
    /* no freshly dropped file — fall through to the recorded one */
  }
  const recorded = path.join(ROOT, "public", currentSrc.replace(/^\//, ""));
  return { buffer: await readFile(recorded), from: recorded };
}

/**
 * Delete every other revision of this artwork, so the directory holds exactly
 * one file per piece and a stale hash cannot be served or committed.
 */
async function pruneOldRevisions(slug, keepFilename) {
  const entries = await readdir(OUT_DIR).catch(() => []);
  const pattern = new RegExp(`^${slug}(\\.[0-9a-f]{8})?\\.(png|jpg)$`);
  for (const name of entries) {
    if (name !== keepFilename && pattern.test(name)) {
      await unlink(path.join(OUT_DIR, name)).catch(() => {});
    }
  }
}

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


/**
 * Wall tones, kept in step with WALL_TONES in src/content/finishes.ts.
 *
 * A dimensional piece is specified with its wall, so the placeholder is drawn
 * for the wall it is meant for: pale letters for a dark wall, dark letters for
 * a light or colour one. The tone itself is never painted into the image — see
 * the note in lib/dimensional-art.mjs.
 */
const WALL = {
  dark: "#33363B",
  light: "#EDEAE3",
  accent: "#F5C518",
};

/**
 * Face, cut edge and accent for each wall tone.
 *
 * The cut edge is darker than a pale face and lighter than a dark one. That is
 * how a real bevel reads — the side catches light at a different angle from the
 * face — and it is load-bearing here: with a near-black face and a black edge
 * there is no extrusion to see, and a word cloud collapses into one silhouette.
 */
const PALETTES = {
  dark: {
    face: "#FFFFFF",
    side: "#9FA3AA",
    accent: "#F2C10D",
    accentSide: "#A17C07",
    shadow: "#000000",
    line: ["#4E9BF5", "#7ACB43", "#F0468C", "#F2C10D", "#22C7B4", "#9B72F0"],
    lineSide: ["#2A5E9E", "#4A8226", "#9C2359", "#A17C07", "#127F73", "#5F44A3"],
    // Gold mirror on charcoal: the premium finish this market asks for by name.
    mirror: ["#7A5C1C", "#F7E9B0", "#C9A445"],
    mirrorEdge: "#4A3610",
  },
  light: {
    face: "#16130F",
    // Lighter than the face on purpose: see the note above the table.
    side: "#6B6357",
    accent: "#B8860B",
    accentSide: "#6E4F06",
    shadow: "#000000",
    line: ["#2F7BE8", "#5FAE2E", "#E0357F", "#E0A800", "#17B3A3", "#7C4DE0"],
    lineSide: ["#1B4C93", "#3B7020", "#8E1F50", "#8F6A00", "#0C6E64", "#4B2C94"],
    // Silver mirror, which needs a darker base than gold to read on a pale wall.
    mirror: ["#7E858E", "#FFFFFF", "#BFC5CC"],
    mirrorEdge: "#565C64",
  },
  accent: {
    face: "#16130F",
    side: "#6E5A2A",
    accent: "#7A2E12",
    accentSide: "#3F1708",
    shadow: "#000000",
    line: ["#16130F", "#7A2E12", "#1B4C93", "#3B7020", "#8E1F50", "#0C6E64"],
    lineSide: ["#000000", "#3F1708", "#0E2A52", "#1F3D12", "#4C0F2A", "#053A34"],
    // Black mirror, graphic against a colour wall.
    mirror: ["#0C0B09", "#5E5A52", "#26231E"],
    mirrorEdge: "#000000",
  },
};

/**
 * Word pools. These are the words that actually appear on office walls, which
 * is what makes a placeholder cloud read as the product rather than as lorem
 * ipsum.
 */
const CLOUD_WORDS = [
  "GO", "MEDIA", "BRAIN", "PROCESS", "COMMUNICATE", "OK", "WORDS", "POSITIVE",
  "SUCCESS", "THINK", "GOAL", "RESEARCH", "TEAM", "CREATIVE", "SELL", "MEETING",
  "POWER", "GROWTH", "FOCUS", "BUILD", "LEARN", "SHIP", "ASK", "DRAFT", "SOLVE",
  "LISTEN", "MAKE", "TRY", "PLAN", "DEEP", "WORK", "IDEAS",
];

const HEROES = {
  "idea-bulb": "IDEA",
  "growth-arrow": "GROWTH",
  collective: "TEAM",
  "deep-work": "FOCUS",
};

/**
 * A word set per piece, not one list for the collection.
 *
 * `lineArtBulbs` never touches its RNG — every stroke is derived from the words,
 * the canvas and the palette — so two pieces of the same orientation and wall
 * tone produced byte-identical artwork. Hanging Goals and Six Questions were the
 * same image, and so were Lit and Bright Ideas: four cards in the portfolio
 * showing two pieces.
 *
 * The fix is words rather than randomness, which is also better content. Six
 * Questions holding who/what/when/where/why/how is the piece its title
 * describes; the same six bulbs holding "Innovation, Goals, Success" were not.
 */
const BULB_WORDS = {
  "six-questions": ["Who", "What", "When", "Where", "Why", "How"],
  "hanging-goals": ["Goals", "Targets", "Focus", "Wins", "Growth", "Next"],
  lit: ["Spark", "Idea", "Insight", "Bright"],
  "bright-ideas": ["Innovation", "Research", "Teamwork", "Success"],
};
const VALUE_WORDS = ["Curious", "Honest", "Together", "Precise", "Bold", "Useful"];

/**
 * Modular sets, by slug: the shape and how many tiles.
 *
 * Counts are the ones this market sells in — six to twenty-two components that
 * the buyer arranges — which is also why the wall planner matters for them.
 */
const MIRROR_SETS = {
  "hexagon-set": { shape: "hexagon", count: 12 },
  "ring-set": { shape: "circle", count: 9 },
  // A band, not a block: this one runs the length of a corridor wall.
  "facet-border": { shape: "triangle", count: 16, rows: 2 },
};

/** Which pieces carry the noughts-and-crosses motif. */
const MOTIF_SLUGS = new Set(["outside-the-box"]);

/**
 * One draw function per collection. Keyed by collection rather than by slug so
 * a new piece in an existing series needs no code — only a catalogue entry.
 */
const GENERATORS = {
  "word-clouds": (r, w, h, p, art) =>
    art_.wordCloudBulb(r, w, h, p, {
      words: CLOUD_WORDS,
      hero: HEROES[art.slug] ?? art.title.split(/\s+/)[0].toUpperCase(),
    }),
  "words-at-work": (r, w, h, p, art) =>
    art_.statementLines(r, w, h, p, { title: art.title, motif: MOTIF_SLUGS.has(art.slug) }),
  "line-and-wire": (r, w, h, p, art) => {
    const words = BULB_WORDS[art.slug];
    // Fail rather than fall back, for the same reason the collection dispatch
    // does: a default here is how two pieces ended up identical.
    if (!words) {
      throw new Error(
        `No bulb words for "${art.slug}" — add a set to BULB_WORDS, one per piece.`,
      );
    }
    return art_.lineArtBulbs(r, w, h, p, { words });
  },
  "values-boards": (r, w, h, p) => art_.valuesBoard(r, w, h, p, { words: VALUE_WORDS }),
  "sacred-lines": (r, w, h, p, art) => art_.raisedScript(r, w, h, p, { word: art.title }),
  "brand-walls": (r, w, h, p, art) => art_.brandWall(r, w, h, p, { title: art.title }),
  "mirror-acrylic": (r, w, h, p, art) => {
    const set = MIRROR_SETS[art.slug];
    return set
      ? art_.mirrorSet(r, w, h, p, set)
      : art_.mirrorScript(r, w, h, p, { word: art.title });
  },
};

/** Transparent canvas: the wall belongs to the room, not to the image. */
function svgOpen(w, h) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`;
}

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
/**
 * How many countable things each collection's generator draws for one piece.
 *
 * Returns null where the count is not fixed — a word cloud deals a variable
 * number of words, and asserting anything about it would be inventing a rule.
 */
function drawnItemCount(art) {
  if (art.collection === "line-and-wire") {
    const words = BULB_WORDS[art.slug];
    // The generator clamps to 4-6 whatever it is given.
    return words ? Math.min(6, Math.max(4, words.length)) : null;
  }
  if (art.collection === "values-boards") return Math.min(6, VALUE_WORDS.length);
  if (art.collection === "mirror-acrylic") return MIRROR_SETS[art.slug]?.count ?? null;
  return null;
}

/**
 * An alt text that counts something has to count it correctly.
 *
 * Alt text is what a screen reader reads out and what a search engine indexes, so
 * a wrong number there is wrong in the two places it is hardest to notice. House
 * Rules said "five value words" while its generator drew six, and Bright Ideas
 * said "six outlined lightbulbs" while the landscape pieces take four — both
 * survived because nothing compared the sentence to the picture.
 *
 * Only a number immediately followed by the thing being drawn is checked. The alt
 * texts also mention millimetres and standoffs, and matching those would produce
 * nothing but noise.
 */
const COUNT_WORDS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
};

function assertAltCount(art) {
  const drawn = drawnItemCount(art);
  if (drawn === null) return;
  const match = art.alt.match(
    /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d+)\s+(?:[a-z-]+\s+){0,2}(words?|lightbulbs?|letters?|shapes?|hexagons?|circles?|triangles?|mirrors?)\b/i,
  );
  if (!match) return;
  const claimed = COUNT_WORDS[match[1].toLowerCase()] ?? Number(match[1]);
  if (claimed !== drawn) {
    throw new Error(
      `Artwork "${art.slug}" alt text claims ${claimed} ${match[2]} but its generator draws ${drawn}. ` +
        `Alt text is read aloud and indexed, so correct the sentence or drop the count.`,
    );
  }
}

/**
 * The rectangle of the image that actually carries ink, as fractions of it.
 *
 * These are cut letters on a transparent ground, so a piece with a short word in
 * the middle leaves large empty margins — and the printable true-size template
 * tiles the whole rectangle, blank margins included. Measured across every piece
 * and size, 31% of those sheets have no ink on them at all, and the worst case is
 * Name in Gold at Large: 29 blank sheets out of 35. Somebody was feeding 35
 * sheets through a printer for six sheets of content.
 *
 * Measured here because the pixels are already in hand, and stored rather than
 * recomputed because reading a 1500x2000 alpha channel is not something to do
 * while rendering a page.
 *
 * Alpha above 8 rather than above 0: the generators antialias, and a stray pixel
 * at 1/255 opacity is not ink, but it would stretch the box to the full canvas
 * and quietly make the whole measurement useless.
 */
async function measureInkBounds(buffer) {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < info.height; y += 1) {
    const row = y * info.width;
    for (let x = 0; x < info.width; x += 1) {
      if (data[(row + x) * info.channels + 3] <= 8) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  // A piece with no ink at all cannot happen, but returning the full rectangle
  // is the safe answer if it ever does: it prints everything rather than nothing.
  if (maxX < 0) return { left: 0, top: 0, right: 1, bottom: 1 };

  const round = (n) => Math.round(n * 10000) / 10000;
  return {
    left: round(minX / info.width),
    top: round(minY / info.height),
    right: round((maxX + 1) / info.width),
    bottom: round((maxY + 1) / info.height),
  };
}

async function buildOgCard(art, collectionName, sourceFile, wall, outFile) {
  const W = 1200;
  const H = 630;
  const IMG_W = Math.round(W * 0.56);
  const PANEL_X = IMG_W + 56;
  const PANEL_W = W - PANEL_X - 56;
  /** Matte, so no piece touches the edge of its panel. */
  const PAD = 48;

  /**
   * Matted, not cropped — the same rule the gallery tile follows and states in
   * its own docstring: cropping an artwork misrepresents the piece being sold.
   *
   * This used `fit: "cover"` with `position: "attention"`, which fills the panel
   * and throws away whatever does not fit. On a 5:2 panorama that is 57% of the
   * width, and "attention" puts the surviving crop in the middle of a word — so
   * the share card for Ask Better Questions read "BETTER / TIONS", cut off at
   * both ends. Six of the twenty-eight pieces are panoramas, and a share card is
   * the first thing anyone sees of this studio on WhatsApp.
   *
   * `contain` against the piece's own wall colour letterboxes with wall rather
   * than with a bar, so a panorama reads as a wide piece hung on a wall.
   */
  const image = await sharp(sourceFile)
    .resize(IMG_W - PAD * 2, H - PAD * 2, { fit: "contain", background: wall })
    .extend({ top: PAD, bottom: PAD, left: PAD, right: PAD, background: wall })
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
  const inkBounds = {};
  let renamed = 0;
  /** Image hash to the piece that produced it, so a collision fails loudly. */
  const seenHashes = new Map();
  for (const art of artworks) {
    const { width: w, height: h } = art.image;

    const wall = WALL[art.wallTone];
    if (!wall) throw new Error(`Artwork "${art.slug}" has no known wallTone`);

    let buffer;
    if (BLUR_ONLY) {
      ({ buffer } = await readMaster(art.slug, art.image.src));
    } else {
      const p = PALETTES[art.wallTone];
      const gen = GENERATORS[art.collection];
      // Fail rather than fall back. A silent default meant a new collection
      // quietly rendered as the wrong series, which nothing downstream catches.
      if (!gen) {
        throw new Error(
          `No generator for collection "${art.collection}" (artwork "${art.slug}")`,
        );
      }
      assertAltCount(art);
      const svg = svgOpen(w, h) + gen(rng(art.slug), w, h, p, art) + "</svg>";
      buffer = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
    }

    // The filename follows the bytes, so an unchanged image keeps its URL (and
    // its caches) while a changed one gets a new URL nothing has cached.
    const hash = contentHash(buffer);

    /**
     * Two pieces must never be the same image.
     *
     * Content-addressed filenames make this invisible: identical bytes get an
     * identical name, so the two pieces quietly share one file and the portfolio
     * shows the same picture twice with two different titles. That is what
     * happened to Hanging Goals and Six Questions, and to Lit and Bright Ideas —
     * four cards, two images — because their generator ignores its RNG and
     * derives everything from inputs those pairs shared.
     */
    if (seenHashes.has(hash)) {
      throw new Error(
        `Artwork "${art.slug}" generated the same image as "${seenHashes.get(hash)}". ` +
          `Give it its own inputs — a shared filename hides this completely.`,
      );
    }
    seenHashes.set(hash, art.slug);

    const filename = `${art.slug}.${hash}.png`;
    const file = path.join(OUT_DIR, filename);
    await writeFile(file, buffer);
    await pruneOldRevisions(art.slug, filename);

    const src = `/artworks/${filename}`;
    if (art.image.src !== src) {
      art.image.src = src;
      renamed += 1;
    }

    // Flatten onto the wall tone before the blur and the share card. Both are
    // opaque JPEG, and an alpha ground flattens to black by default — which
    // would give every piece a black placeholder and a black share card.
    const onWall = await sharp(buffer).flatten({ background: wall });
    const tiny = await onWall.clone().resize(20).jpeg({ quality: 40 }).toBuffer();
    blur[art.slug] = `data:image/jpeg;base64,${tiny.toString("base64")}`;
    inkBounds[art.slug] = await measureInkBounds(buffer);

    await buildOgCard(
      art,
      collectionName[art.collection] ?? "",
      await onWall.clone().jpeg({ quality: 90 }).toBuffer(),
      wall,
      path.join(OG_DIR, `${art.slug}.jpg`),
    );

    console.log(`ok ${art.slug}`);
  }

  await writeFile(
    path.join(ROOT, "src", "content", "blur.json"),
    JSON.stringify(blur, null, 2) + "\n",
  );

  await writeFile(
    path.join(ROOT, "src", "content", "ink-bounds.json"),
    JSON.stringify(inkBounds, null, 2) + "\n",
  );

  // artworks.json is the source of truth for every consumer, so the new URLs
  // have to land there rather than in a side manifest the content layer would
  // need to reconcile.
  if (renamed > 0) {
    await writeFile(ARTWORKS_JSON, JSON.stringify(artworks, null, 2) + "\n");
    console.log(`updated artworks.json: ${renamed} image URL(s) re-hashed`);
  }

  /**
   * Remove files for pieces that are no longer in the catalogue.
   *
   * Per-slug pruning cannot see these: when a piece is retired its slug stops
   * being iterated, so its file is never visited and sits in the directory
   * being deployed and served forever. Renaming the whole catalogue left twenty
   * of them behind.
   */
  const wanted = new Set(artworks.map((a) => path.basename(a.image.src)));
  let orphans = 0;
  for (const name of await readdir(OUT_DIR).catch(() => [])) {
    if (!wanted.has(name)) {
      await unlink(path.join(OUT_DIR, name)).catch(() => {});
      orphans += 1;
    }
  }
  const ogWanted = new Set(artworks.map((a) => `${a.slug}.jpg`));
  for (const name of await readdir(OG_DIR).catch(() => [])) {
    if (!ogWanted.has(name)) {
      await unlink(path.join(OG_DIR, name)).catch(() => {});
      orphans += 1;
    }
  }
  if (orphans) console.log(`removed ${orphans} file(s) for pieces no longer in the catalogue`);

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
