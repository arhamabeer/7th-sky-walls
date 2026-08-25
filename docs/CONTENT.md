# Content authoring guide

All site content lives in `src/content/` as typed JSON, validated against Zod
schemas at build time. Invalid content fails the build with a readable error
rather than rendering a broken page.

## Adding an artwork

1. Add the artwork image to `public/artworks/<slug>.jpg`. Use a real
   photograph or flat scan at roughly 1600×2000 (portrait), 2000×1500
   (landscape) or 1800×1800 (square).
2. Append an entry to `src/content/artworks.json`:

```json
{
  "slug": "kebab-case-unique-id",
  "title": "Artwork Title",
  "collection": "one-of-the-ids-in-collections.json",
  "description": "At least 20 characters. Shown on the detail page and used as the meta description.",
  "alt": "Descriptive alt text for screen readers and image SEO.",
  "venues": ["office", "hotel"],
  "styles": ["abstract", "geometric"],
  "orientation": "portrait",
  "image": { "src": "/artworks/kebab-case-unique-id.jpg", "width": 1600, "height": 2000 },
  "sizes": ["s", "m", "l", "xl"],
  "defaultSize": "l",
  "customText": false,
  "materials": ["Archival matte canvas", "Floating hardwood frame"],
  "year": 2026,
  "featured": false
}
```

3. Refresh the blur placeholder map:

```bash
npm run generate:placeholders -- --blur-only
```

   This also gives the image a content-addressed filename — it renames
   `<slug>.jpg` to `<slug>.<hash>.jpg`, removes the old revision, and rewrites
   `image.src` in `artworks.json` to match. Write the plain `<slug>.jpg` name
   in the JSON and let the script fill in the hash; committing the change it
   makes is part of the edit.

   The hash exists because `next/image` keys its cache on the request URL.
   Replacing a file in place leaves the URL unchanged, so the optimizer and
   every browser that has already loaded the page keep serving the old pixels
   — which is how a replaced artwork ended up rendering at its previous aspect
   ratio during development. A query string cannot be used instead:
   `next/image` rejects one on a local source with HTTP 400.

4. Run `npm run build`. The artwork gets its own static page, sitemap entry,
   `VisualArtwork` structured data, and OpenGraph card automatically.

### Field reference

| Field | Notes |
| --- | --- |
| `slug` | Kebab-case, becomes the URL at `/portfolio/<slug>` |
| `collection` | Must match an `id` in `collections.json` — the build fails otherwise |
| `venues` | Any of `office`, `cafe`, `restaurant`, `hotel`, `school`, `university`; drives the portfolio filters |
| `orientation` | `portrait`, `landscape` or `square`; controls card aspect ratio and how size dimensions are read |
| `sizes` | Any of `s`, `m`, `l`, `xl`, `square`, `panorama`; defined in `src/content/catalog.ts` |
| `defaultSize` | Must appear in `sizes`; used for AR model generation and structured data dimensions |
| `customText` | `true` for calligraphy and typography pieces that support customer-supplied text |
| `featured` | `true` surfaces it on the home page |

## Adding a collection

Append to `src/content/collections.json` with `id`, `name` and `description`.
The `id` is what artworks reference.

## Editing services, case studies and UI copy

- Services: `src/content/services.json`
- Case studies: `src/content/case-studies.json` (set `isPlaceholder: false`
  once a story is real — the "illustrative example" note disappears)
- All UI strings: `src/content/copy.ts`
- Size chart and venue definitions: `src/content/catalog.ts`

## Changing brand identity

Everything brand-related is in `src/config/site.config.ts`: name, legal name,
tagline, description, canonical URL, founding year, logo and icon paths, color
palette, contact details, address, coordinates, opening hours, social links and
the GA4 measurement id. Editing that one file rebrands the entire site,
including metadata, structured data, the manifest, sitemap URLs, header,
footer and the OpenGraph card.

Typography lives in `src/config/fonts.ts` — swap the two `next/font` imports to
change the display and body typefaces.

To replace the logo, overwrite `public/brand/mark.svg` and regenerate the app
icons:

```bash
npm run generate:placeholders
```

## Replacing placeholder artwork with real photography

Drop real files at `public/artworks/<slug>.jpg` — the plain name, alongside the
hashed placeholders already there — update the `image.width` and `image.height`
values to the real pixel dimensions, then run:

```bash
npm run generate:placeholders -- --blur-only
npm run generate:ar
npm run check:images && npm run check:ar
```

The first command picks up each dropped file, gives it a hashed name, deletes
the placeholder it replaces, refreshes the blur map and the OpenGraph card, and
rewrites `artworks.json`. The second rebuilds the AR models, which bake the
artwork as a texture and are otherwise still showing the placeholder. The
checks confirm the declared dimensions match the files and that all 96 AR pairs
still encode their advertised sizes.

Do not run `generate:placeholders` without `--blur-only` once real images are
in place — it regenerates the placeholder art and would overwrite them.
