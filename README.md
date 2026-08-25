# Wall Art Portfolio

A portfolio-first web app for a commercial wall art studio, built around a
real-time AR "try this art on your own wall" experience. No cart, no checkout —
every path ends in an inquiry.

Brand identity is fully configurable from a single file:
[`src/config/site.config.ts`](src/config/site.config.ts). Renaming the brand
requires editing only that file.

The work is **cut dimensional lettering** — raised letters and word-cloud panels
mounted on a wall, not printed pictures. Artwork images are therefore PNG with
alpha and no ground: the letters are the artwork and the wall behind them is the
room's. Every piece declares the wall tone it is specified for.

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:3000. Copy `.env.example` to `.env.local` if you
want real email delivery; without it, inquiries are logged to the console and
everything else works.

## Scripts

### Building content and assets

| Script | Purpose |
| --- | --- |
| `npm run generate:placeholders` | Regenerate placeholder artwork, blur placeholders, social cards and app icons. Gives each image a content-addressed filename and rewrites `artworks.json`, because `next/image` keys its cache on a URL that would otherwise not change when a file is replaced. |
| `npm run generate:placeholders -- --blur-only` | Ingest real artwork dropped at `public/artworks/<slug>.png` (transparent ground): hashes and renames it, prunes the file it replaces, and refreshes blur placeholders and social cards. Use this once real artwork is in place — the full command would overwrite it. |
| `npm run generate:ar` | Build the GLB and USDZ for every artwork at every size, plus the manifest the app reads. |

### Checking

| Script | Purpose |
| --- | --- |
| `npm run verify` | Build, serve, check the hero arrangement, then audit 31 viewports across 16 pages. Refuses to audit a stale build. |
| `npm run serve` | Serve the production build for the checks that need one. Frees the port first and refuses to serve anything but the build on disk. |
| `npm run test:interaction` | 259 behavioural checks across mobile, tablet, desktop, reduced-motion and rate-limit contexts, including the keyboard path. Needs a server running. |
| `npm run lighthouse` | SEO, best practices and accessibility gated at 90 across eleven routes. Needs a server running. |
| `npm run lighthouse:detail <report>` | Read a saved report and show what is costing time. |
| `npm run check:images` | Every artwork file matches its declared dimensions. |
| `npm run check:ar` | Every AR asset encodes its advertised size and is Quick Look shaped. |
| `npm run check:analytics` | Analytics load where they work and, just as importantly, not where they do not. |
| `npm run check:slug-refs` | Every artwork and collection slug referenced in code still exists in the catalogue. |
| `npm run check:brand` | Renaming the studio touches one config file and nothing else. Swaps in a long name and a new palette, rebuilds, checks the output and the header, then restores. Two builds — not for every change. |
| `npm run audit:responsive` | The viewport audit on its own, against a running server. |
| `npm run shots` | Full-page screenshots for review. `--selector` captures one element; `--click` presses a control first. |

## Project structure

```
src/
  app/                     Routes (App Router)
    page.tsx               Home
    portfolio/             Index with filters + [slug] artwork detail
    collections/           Index + [id] series pages
    services/  about/  contact/
    actions/               Server actions
    sitemap.ts  robots.ts  manifest.ts  opengraph-image.tsx
  components/
    analytics/  ar/  artwork/  home/  inquiry/  layout/  motion/  seo/  ui/
  config/
    site.config.ts         SINGLE SOURCE OF BRAND TRUTH
    fonts.ts               Typeface pairing
  content/                 Structured content, validated at build time
  lib/
    content/  inquiry/  seo/
  types/                   model-viewer element declaration
scripts/
  ar/                      AR asset builders and validators
  generate-*.mjs           Asset generation
  verify.mjs               One-command build, serve and audit
  *-tests.mjs, check-*.mjs Verification harnesses
docs/
  PLAN.md                  Phases, decisions and the constraints behind them
  CONTENT.md               Adding artworks, editing copy, rebranding
  LAUNCH.md                Pre-launch checklist
  AR-DEVICE-QA.md          What only a real phone can confirm
  QUESTIONS.md             Decisions waiting on the owner
```

## Conventions

These are enforced by the checks above, not just aspirations.

- Brand strings never appear outside `site.config.ts`
- Content is validated at build time; invalid content fails the build rather
  than rendering a broken page
- Every size of an artwork shares one aspect ratio, so nothing is ever cropped
  to fit — and the AR models match the printed proportions
- Animation is transform/opacity only and honours `prefers-reduced-motion`;
  content visibility never depends on JavaScript
- 3D, AR and the camera overlay load on interaction, never at page load
- Navigation and filters are real anchors, so they stay crawlable
- Touch targets are at least 44px; every image has meaningful alt text
- Zero console errors in production

## Current state

Phases 1 through 9 are built and deployed. Twenty-eight pieces across seven
collections; 112 AR asset pairs. SEO, best practices and accessibility score 100
on every one of eleven routes.

A configured piece carries the customer's wording all the way into AR: the
browser shapes the text, draws it to a canvas, and authors a GLB from it, which
is what makes Urdu in Nastaliq possible at all — there is no working
server-side shaper for it. iOS still receives the pre-built USDZ, because Quick
Look's handling of cutout alpha is unverified without a device.

Outstanding before launch: the materials list needs confirming (it was rewritten
from research after the product category changed), real business details, real
installation photography, email credentials, and AR device testing on an iPhone
— see [LAUNCH.md](docs/LAUNCH.md) and [QUESTIONS.md](docs/QUESTIONS.md).
