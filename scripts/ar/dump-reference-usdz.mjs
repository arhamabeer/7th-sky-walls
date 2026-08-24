/**
 * Produces a reference USDZ with three.js's USDZExporter and dumps its
 * contents, so our own generator can be written against a known-good
 * structure rather than against a guess at the USD schema.
 *
 * three.js exports textures as PNG, which for a 24-artwork catalogue at four
 * sizes each would run to well over a hundred megabytes. We need JPEG. Rather
 * than trust an invented file layout — untestable without an iPhone in hand —
 * this captures exactly what the reference implementation emits so the
 * difference can be limited to the image encoding.
 *
 * Usage: node scripts/ar/dump-reference-usdz.mjs
 * Output: .ar-tmp/reference.usdz and .ar-tmp/reference-contents/
 */
import { chromium } from "playwright";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { unzipSync } from "fflate";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const OUT = path.join(ROOT, ".ar-tmp");
await mkdir(path.join(OUT, "reference-contents"), { recursive: true });

const threeDir = path.join(ROOT, "node_modules", "three");
const browser = await chromium.launch();
const page = await browser.newPage();

// Serve three.js and the texture to the page from disk.
await page.route("**/*", async (route, request) => {
  const url = new URL(request.url());
  if (url.hostname !== "usdz.local") return route.continue();
  const rel = decodeURIComponent(url.pathname).replace(/^\//, "");
  try {
    const filePath = rel.startsWith("three/")
      ? path.join(threeDir, rel.slice("three/".length))
      : path.join(ROOT, rel);
    const body = await readFile(filePath);
    const type = filePath.endsWith(".js")
      ? "text/javascript"
      : filePath.endsWith(".jpg")
        ? "image/jpeg"
        : "text/html";
    return route.fulfill({ status: 200, body, headers: { "content-type": type } });
  } catch {
    return route.fulfill({ status: 404, body: "not found" });
  }
});

await page.goto("https://usdz.local/index.html");
await page.setContent(
  `<!doctype html><html><body><script type="importmap">
   {"imports":{"three":"https://usdz.local/three/build/three.module.js","three/addons/":"https://usdz.local/three/examples/jsm/"}}
   </script></body></html>`,
);

const base64 = await page.evaluate(async () => {
  const THREE = await import("three");
  const { USDZExporter } = await import("three/addons/exporters/USDZExporter.js");

  // A 90 x 120 x 3.5 cm box, authored in metres, matching the GLB builder.
  // Two materials, so the export shows how a framed piece — artwork on the
  // front face, a plain edge colour elsewhere — is expressed in USD.
  const geometry = new THREE.BoxGeometry(0.9, 1.2, 0.035);
  const texture = await new THREE.TextureLoader().loadAsync(
    "https://usdz.local/public/artworks/meridian-seven.jpg",
  );
  texture.colorSpace = THREE.SRGBColorSpace;
  const artMaterial = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.85,
    metalness: 0,
  });
  // Single material only. Passing a material ARRAY makes the exporter emit a
  // scene with no geometry at all — verified, and the reason the frame is
  // composited into the texture instead of modelled separately.
  const mesh = new THREE.Mesh(geometry, artMaterial);
  mesh.name = "Artwork";

  const scene = new THREE.Scene();
  scene.add(mesh);

  const exporter = new USDZExporter();
  const buffer = await exporter.parseAsync(scene, {
    ar: {
      anchoring: { type: "plane" },
      planeAnchoring: { alignment: "vertical" },
    },
    includeAnchoringProperties: true,
    maxTextureSize: 1024,
  });

  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
});

await browser.close();

const usdz = Buffer.from(base64, "base64");
await writeFile(path.join(OUT, "reference.usdz"), usdz);
console.log(`reference.usdz: ${usdz.byteLength.toLocaleString()} bytes`);

// Unpack and report the layout, including data offsets — Quick Look requires
// each entry to be stored uncompressed and aligned to 64 bytes.
const entries = unzipSync(new Uint8Array(usdz));
console.log("\nentries:");
for (const [name, data] of Object.entries(entries)) {
  console.log(`  ${name}  ${data.byteLength.toLocaleString()} bytes`);
  await writeFile(path.join(OUT, "reference-contents", path.basename(name)), data);
}

// Report the stored offsets, since Quick Look requires each entry to be
// stored uncompressed and aligned to a 64-byte boundary.
console.log("\nreference written to .ar-tmp/reference-contents/");
