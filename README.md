# Wall Art Portfolio

A portfolio-first web app for a commercial wall art studio, built around a
real-time AR "try this art on your own wall" experience. No cart, no checkout —
every path ends in an inquiry.

Brand identity is fully configurable from a single file: `src/config/site.config.ts`.

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development server (Turbopack) |
| `npm run build` | Production build with type checking |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run generate:placeholders` | Regenerate placeholder artwork images, blur placeholders and app icons |
| `npm run generate:placeholders -- --blur-only` | Refresh blur placeholders only — use this once real artwork images are in place |

## Project structure

```
src/
  app/                     Routes (App Router)
    page.tsx               Home
    portfolio/             Portfolio index + [slug] artwork detail
    services/  about/  contact/
    sitemap.ts  robots.ts  manifest.ts  opengraph-image.tsx
  components/
    layout/                Header, footer, mobile nav
    ui/                    Shared primitives (container, buttons, chips, cards)
    seo/                   JSON-LD script renderer
  config/
    site.config.ts         SINGLE SOURCE OF BRAND TRUTH
    fonts.ts               Typeface pairing
  content/
    artworks.json  collections.json  services.json  case-studies.json
    catalog.ts             Size chart + venue definitions
    copy.ts                All UI copy
    blur.json              Generated blur placeholders
  lib/
    content/               Validated content access layer
    seo/                   JSON-LD builders + metadata helpers
scripts/
  generate-placeholders.mjs
docs/
  PLAN.md                  Phase-wise development plan and verified constraints
  CONTENT.md               How to add artworks, services and rebrand
```

## Documentation

- [Development plan](docs/PLAN.md) — phases, stack decisions, and the verified
  platform constraints behind the AR strategy
- [Content guide](docs/CONTENT.md) — adding artworks, editing copy, rebranding

## Conventions

- Brand strings never appear outside `site.config.ts`
- Animation is transform/opacity only and honors `prefers-reduced-motion`
- 3D and AR bundles load on interaction, never at page load
- Navigation and filters are real anchors so they stay crawlable
- Touch targets are at least 44px; every image has meaningful alt text
