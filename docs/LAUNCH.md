# Launch checklist

Work through this in order. Everything above the line can be done today;
everything below it needs real business details or a real device.

## Automated gates

Run these and expect them all to pass. Each one has caught a real defect
during development, which is why they exist.

```bash
npm run lint
npm run check:images
npm run check:ar
npm run check:slug-refs
npm run check:analytics
npm run check:print
npm run check:image-sizes
npm run check:seo
npm run verify
npm run test:interaction
npm run lighthouse
```

| Command | What it proves |
| --- | --- |
| `check:images` | Every artwork file on disk matches the dimensions the site declares. A mismatch causes layout shift and letterboxed renders. |
| `check:ar` | All 112 AR asset pairs encode the exact finished size advertised, carry the Quick Look rotation and vertical anchoring, and are packed the way Quick Look requires — and were built from the artwork the site currently serves. That last one matters because everything else stays true when the texture inside is a previous version of the piece, which is how four pieces showed the old image in AR with every check passing. It also rebuilds each artwork's texture and compares it to the bytes inside the model, since the manifest is written from the artwork in the same loop that builds the model — so a model carrying another piece's image would be recorded correctly and pass everything else, and somebody would see the wrong artwork at exactly the right size. And it compares the generator's own copy of the orientation aspects and size tiers against `catalog.ts`, which nothing did despite a comment claiming otherwise. |
| `verify` | Production build, hero wall arrangement, the printable templates, image sizing, and the responsive audit across 31 viewports and 20 pages — desktop, laptop, tablet and phone, portrait and landscape. |
| `test:interaction` | Behavioural checks across mobile, tablet and desktop, plus one context each for the Android AR tiers, AR launch-failure recovery, custom wording, Urdu and Arabic, the configurator brief, the client error sink, the materials page, the hanging height, the camera preview's calibration, the AR analytics events, reduced motion, the inquiry handover's encoding, and the rate limiter. Every result is written to `.interaction-report.json`, so a check that fails once can still be named afterwards. The run prints its own counts; this table does not repeat them, because a number kept in two places is the defect this codebase produces most — the count in this cell was itself wrong within a day of being written. |
| `lighthouse` | SEO, best practices and accessibility at 90+ on thirteen routes. All three sit at 100 everywhere except the print template, which scores best practices 96 and is exempt from the SEO gate. Both are deliberate and explained below. |
| `check:print` | The printable templates measured in print media, where nothing else looks: sheet and PDF page boxes in millimetres, the calibration bar at exactly 100mm, nothing clipped by the sheet edge, one PDF page per sheet, the tiled template actually carrying the piece, and the sheet count on the button being the count that prints — blank sheets are omitted, so a count worked out twice is a count that will disagree with itself. Also refuses to run against a server holding a stale build. Included in `verify`. |
| `check:image-sizes` | Every image is fetched at close to the size it is painted, across nine pages at four viewports. Under-fetching fails as an error — a soft image on cut lettering is the product looking cheap — and over-fetching beyond 6x fails too. It found 195 of 289 images over-fetching by up to 61x when it was written. It refuses to pass on zero images measured, and reports any image that never chose a candidate rather than skipping it silently. Included in `verify`. |
| `check:slug-refs` | Every artwork and collection slug referenced by a test, audit or page still exists, and every piece the docs name in bold still exists. Renaming the catalogue leaves stale references that fail as broken features rather than as stale strings — and it left the AR checklist opening with a piece that had been deleted. It also checks the file paths the docs name, by format: `public/artworks/<slug>.png` is deliberately a file that does not exist yet, but its extension has to be one that directory holds, because the plan told anyone ingesting real work to drop a `.jpg` that nothing reads. |
| `check:analytics` | Vercel's cookieless scripts do not load off Vercel and Google Analytics does not load without a measurement id — so a development or preview deployment cannot reach the reporting property. |
| `check:seo` | The SEO facts Lighthouse does not ask about, on every route in the sitemap: that each canonical points at its own page, that the sitemap lists exactly the routes the content implies and nothing that 404s, that no two pages claim the same title or description, and that every structured-data block parses. Lighthouse scores SEO 100 and checks none of these — a canonical pointing elsewhere asks search engines to drop the page, and a route missing from the sitemap is one they may never come back for. The print template is verified to be `noindex` *and* absent from the sitemap, since listing a noindex page is a contradiction. Included in `verify`. |
| `check:brand` | Swaps in a 44-character studio name and a different palette, rebuilds, and confirms no trace of the real brand survives and the header still contains its contents at 320–430px. Restores the real config either way. Two builds, so run it before launch and after touching the header, footer or config shape — not on every change. |

`npm run test:interaction`, `npm run check:analytics` and `npm run lighthouse`
need a server already running — use `npm run serve`, which frees the port first
and refuses to serve a build other than the one on disk. `npm run verify` starts
and checks its own server.

Every one of these gates now refuses to measure a server that is not serving the
build on disk, and says so instead of producing a verdict. That is not
belt-and-braces: `check:analytics` passed three times in one session against a
server started the previous day, because its default port was held by a leftover
process, and the responsive audit — handed its base URL positionally where it
wanted a flag — measured a month-old process on another port and reported 589
status errors and 620 page-viewport combinations with no `h1`. The helper they all share had itself
never worked: it read the served build id with a pattern this version of Next
does not emit, so every comparison against it was dead code and it announced
"verified" on the strength of the id from disk.

### The print template's two non-perfect Lighthouse scores

Both are deliberate, and recorded here so neither gets "fixed" into something
worse.

**SEO 69** is entirely `is-crawlable`. The route is `noindex` on purpose: it
duplicates the artwork page's content and is a poor answer to any search that
could surface it. `scripts/lighthouse.mjs` exempts this one route from the SEO
gate and prints the exemption on every run, so it cannot become invisible.

**Best practices 96** is entirely `font-size`, and it is measuring the sheet
preview. Type on a sheet is a fixed physical 3.2mm; previewing an A4 page inside
a 393px phone therefore renders it at about 5px, and half the page's text is
inside that preview. Two things were done about it: the preview drops to the
first sheet only below 640px, and a line on screen says so. Actually clearing the
audit would mean forcing a 1000px-wide preview on a phone — worse for the person
holding it, purely to move a number. The gate is 90.

### Error boundaries

`error.tsx`, `global-error.tsx` and `FeatureBoundary` cannot be exercised by
the automated suite without shipping code that throws, so they were verified by
hand and should be re-verified if any of the three changes. Each check is a
temporary edit, reverted immediately after:

| Boundary | How to trigger it | Expected |
| --- | --- | --- |
| `error.tsx` | Add `src/app/boom-test/page.tsx` with `export const dynamic = "force-dynamic"` and a `throw` in the component. A static page that throws fails the build instead. | HTTP 500 carrying the branded page, heading "That didn't load.", working retry |
| `global-error.tsx` | Make a client component rendered by the root layout throw in the browser (`if (typeof window !== "undefined") throw …` in `SmoothScroll`) | Branded page with no header, brand background and display font applied, working retry |
| `FeatureBoundary` | Same client-only throw inside `WallPlanner` or `ArtworkExperience` | Page heading, surrounding sections and inquiry all still present; only the panel replaced, with a retry |

Verified 2026-08-25: all three behave as described, including `--brand-accent`
and the display font resolving inside `global-error`, and the planner page
keeping its `h1` and its hanging notes while only the panel is replaced.

## Content and configuration

- [ ] **Replace every TODO in `src/config/site.config.ts`.** Canonical domain,
      legal name, address, geo coordinates, phone, WhatsApp number, inquiry
      email, social URLs, founding year. These appear in canonical URLs,
      structured data and the sitemap, so a placeholder domain here means every
      page tells search engines the wrong address.

      Run **`npm run check:config`** to see what is left. It is the one gate
      expected to *fail* until this item is done, which is why it is not in the
      list above — a failing check in that list would train everyone to skim past
      it. It separates the two placeholders that swallow a lead from the four that
      are merely wrong in public:

      `contact.whatsapp` and `contact.email` are not inert text. The WhatsApp
      number is the site's most prominent call to action — header, footer, every
      artwork page, the planner, the contact page — and it currently opens
      WhatsApp to a number that does not exist. The email is a reserved
      `example.com` address guaranteed never to receive anything. With
      `RESEND_API_KEY` also unset, the form honestly reports that it could not
      send and hands the visitor over to exactly those two dead channels, so
      **right now an inquiry has no working route to the studio at all** — on a
      site where every path ends in an inquiry.
- [ ] **Swap in the real logo** at `public/brand/mark.svg`, then run
      `npm run generate:placeholders` to regenerate the app icons.
- [ ] **Confirm the brand palette and typography** in `site.config.ts` and
      `config/fonts.ts`. Soft brass must not carry text — it does not meet
      contrast at any size.
- [ ] **Replace placeholder artwork** following [the content guide](CONTENT.md),
      then run `npm run generate:placeholders -- --blur-only` and
      `npm run generate:ar`.
- [ ] **Turn off the illustrative note on case studies** by setting
      `isPlaceholder: false` in `case-studies.json` once real project stories
      and photography exist. Until then the page says plainly that they are
      examples, and it should keep saying so.
- [ ] **Confirm the materials list** in `materials.json`. It was rewritten for
      cut dimensional lettering — acrylic, PVC foam, MDF, brushed aluminium,
      printed PLA — from research rather than from the studio, and the
      thicknesses and finishes are stated publicly where a facilities manager
      will quote them back. See question 7a in [QUESTIONS.md](QUESTIONS.md).
- [ ] **Check the lead times** in `services.json`. Concepts in five working days
      and installs in three to six weeks were confirmed against printing, not
      against fabrication and installation of cut letters.

## Environment

Set these in Vercel's project settings. See `.env.example`.

- [ ] `RESEND_API_KEY` and `INQUIRY_FROM_EMAIL` — **without both, submitted
      inquiries are only written to the server log.** The form will still say
      it sent. `assertDeliveryConfigured()` exists so this can be caught in a
      health check rather than by a customer.
- [ ] `INQUIRY_TO_EMAIL` if inquiries should go somewhere other than the
      address in `site.config.ts`.
- [ ] `NEXT_PUBLIC_GA_MEASUREMENT_ID` if Google Analytics is wanted. Without
      it no Google script loads at all.
- [ ] Verify the sending domain with Resend, or mail will be rejected.

## Verify after deploying

- [ ] Submit a real inquiry through the live form and confirm it arrives.
- [ ] `curl -I https://<domain>/ar/sabr/l.usdz` returns
      `Content-Type: model/vnd.usdz+zip`.
- [ ] `https://<domain>/robots.txt` and `/sitemap.xml` show the real domain.
- [ ] Run the Rich Results Test on an artwork page and a collection page.
      Structured data validity does not affect the Lighthouse score but does
      gate rich results.
- [ ] Submit the sitemap in Search Console.
- [ ] Confirm Vercel Analytics and Speed Insights are receiving data — they
      are deliberately inert anywhere other than Vercel.

## Device testing

- [ ] Work through [the AR device checklist](AR-DEVICE-QA.md) on a real iPhone
      and a real Android handset. Orientation, flush mounting, measured true
      scale and scale lock cannot be confirmed any other way, and an incorrect
      USDZ rotation still opens normally — it just hangs the artwork facing
      into the wall.
- [ ] Try the camera preview on both, including the paper calibration.
- [ ] Check the inquiry form on a real phone keyboard.

## After launch

- [ ] Watch field Core Web Vitals in Speed Insights. Local Lighthouse
      performance numbers vary by 15–20 points run to run; field data from real
      devices is the number worth acting on.
- [ ] Watch the AR events — `ar_launch_attempt` against `ar_status` is the pair
      that matters, since attempts rising while statuses stop arriving is what a
      platform-wide breakage looks like from here. The platform viewers break
      independently of this codebase (Scene Viewer was broken for four months in
      2025) and these events are the only warning. The full list, and what each
      one tells you, is in [the AR checklist](AR-DEVICE-QA.md).
