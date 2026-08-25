# Development Plan

Confirmed 2026-08-25. Portfolio-first wall art web app with real-time AR wall
try-on. No cart, no checkout, no payments — every path ends in an inquiry.

## Confirmed decisions

| Decision | Choice |
| --- | --- |
| Brand assets | Partially ready; palette/typography proposed in Phase 1, swappable via `site.config.ts` |
| Content source | Local typed JSON/MDX in repo, schema designed for CMS migration |
| Launch catalog | 16–30 artworks (24 placeholders seeded) |
| Inquiry channels | Contact form (email delivery) + WhatsApp click-to-chat with prefilled context |
| Language | English only; copy centralized and logical CSS properties used so RTL Urdu is a later config change |
| Analytics | Vercel Analytics + Google Analytics 4 |
| Hosting | Vercel, custom domain |
| Pricing | Not displayed — inquiry-only model |
| Sizes | Standard size chart; per-artwork size/frame variants |
| Customizer | Variants on all artworks + custom text/typography/colors on text-based pieces, on-screen live preview |
| Custom art in AR | Deferred — needs server-side USDZ generation |
| Delivery pace | Balanced: core site and baseline AR first, signature polish after |

## Stack

| Layer | Choice | Pinned version |
| --- | --- | --- |
| Framework | Next.js App Router + TypeScript | 16.3.2 |
| UI runtime | React / React DOM | 19.2.8 |
| Styling | Tailwind CSS | 4.x |
| Motion | Motion (formerly Framer Motion) + GSAP ScrollTrigger + Lenis (desktop only) | 13.x / 3.15 / 1.3.x |
| 3D / AR | React Three Fiber + drei + `@google/model-viewer` | 9.7 / 10.7 / 4.3.1 |
| three.js | Pinned to satisfy model-viewer's peer range | 0.183.x |
| AR pipeline | glTF-Transform (GLB) + three USDZExporter in headless Chromium (USDZ) + sharp | 4.4.x |
| Validation | Zod | 4.x |
| Structured data | schema-dts | 1.x |

### Verified constraints behind these choices

- **iOS Safari has no handheld WebXR** (verified through Safari iOS 26.6). AR on
  iPhone must go through AR Quick Look, which leaves the page. A custom WebXR
  experience is Android Chrome / Samsung Internet only.
- **`<model-viewer>`'s auto-generated USDZ silently drops wall anchoring and
  fixed scale** (upstream issue #3989, open since 2022; fix PR unmerged). Every
  artwork therefore needs a pre-generated `.usdz` served via `ios-src`, authored
  with `preliminary:anchoring:type="plane"` and
  `preliminary:planeAnchoring:alignment="vertical"`, plus the compensating
  ~-90° X rotation Quick Look requires for vertical placement.
- **True-to-scale is an authoring problem, not a tracking problem.** Author
  models in meters, set `ar-scale="fixed"` (Android → Scene Viewer
  `resizable=false`) and rely on `#allowsContentScaling=0` (iOS, added
  automatically by model-viewer for a static `ios-src`).
- **Scene Viewer can break platform-wide** without any change on our side (an
  Android 16 crash regression ran from Oct 2025 to Feb 2026). AR launch
  failures must be instrumented and the universal fallback must be reachable
  from the same UI.
- **`Product` structured data without offers is ineligible for rich results.**
  Portfolio pieces use `VisualArtwork` + `ImageObject` license metadata under a
  site-wide `LocalBusiness` + `WebSite` graph.
- **Keep native scrolling on touch.** Lenis stays desktop-only (`syncTouch`
  off); GSAP pinning is simplified below tablet width via `gsap.matchMedia()`;
  `ScrollSmoother` is not used at all.
- **iOS Safari breaks `background-attachment: fixed`.** Parallax uses a
  `position: fixed`/`sticky` image layer or a scroll-driven transform.

## Cross-cutting rules

Applied in every phase, not retrofitted:

1. All brand identity lives in `src/config/site.config.ts`. Renaming the brand
   must require editing only that file — no brand strings in component names,
   asset filenames, CSS classes, or copy.
2. Animation is transform/opacity only, honors `prefers-reduced-motion`, and
   never starts the LCP element at `opacity: 0`.
3. 3D and AR bundles load on interaction or visibility, never at page load, and
   never on marketing routes.
4. Navigation and filters are real `<a href>` links so they are crawlable.
5. Every image has meaningful alt text; heading order is semantic; touch
   targets are at least 44px.
6. Zero console errors in production.

## Phases

### Phase 1 — Foundation, brand system, live skeleton — COMPLETE

Deployed, browsable, SEO-complete five-page site on a premium base design.

- Next.js 16 + TypeScript strict + Tailwind 4 scaffold
- `site.config.ts` with the full brand schema; palette and dual-typeface
  proposal (Fraunces display + Manrope body)
- Content layer: Zod-validated schemas for artworks, collections, services,
  case studies; 24 seeded placeholder artworks; standard size chart
- All five routes with header, footer, mobile nav, and shared UI primitives
- SEO plumbing: Metadata API with `metadataBase` and title template,
  `LocalBusiness` + `WebSite` + `VisualArtwork` + `BreadcrumbList` JSON-LD,
  `sitemap.ts` with image entries, `robots.ts`, `manifest.ts`, canonical URLs,
  branded OG image
- Placeholder artwork generation script with blur-placeholder output

### Phase 2 — Immersive portfolio and artwork pages — IN PROGRESS

Done:

- Venue and collection filtering with staggered viewport reveals, filters as
  real crawlable links that combine rather than replace each other
- Scroll progress indicator; desktop-only smooth scrolling
- Fullscreen artwork viewer with scroll lock, Escape, and focus return
- **True-scale room preview** with venue-specific scenes (lounge, office
  reception, café, dining room, hotel lobby, classroom), each carrying real
  furniture heights as scale anchors, defaulting to the artwork's primary
  venue and updating live with the selected size
- Aspect-consistent size model so an artwork never changes proportion between
  sizes — a prerequisite for correct AR models in Phase 3
- Per-artwork social share cards, composed at build time
- Verification harnesses: 31-viewport responsive audit, 79-check interaction
  test suite, image dimension guard

Remaining:

- Previous/next navigation between artworks within a collection
- Editorial grid treatment for the portfolio index
- Collection landing pages

**Enhancements adopted during the phase** (approved standing instruction to
improve the app as opportunities appear):

1. Venue-specific room scenes rather than a single generic living room —
   directly serves the B2B audience and has no equivalent at any competitor
   studied.
2. Automated responsive auditing across 31 device profiles, run against the
   production build with a guard that refuses to audit a stale one.
3. Automated interaction testing, including a reduced-motion context, because
   a backgrounded browser throttles animation and makes manual checking
   unreliable.
4. Build-time social cards instead of runtime rendering — deterministic, free
   at request time, and brand-neutral so a rebrand needs no asset changes.

### Phase 3 — AR try-on baseline (tier 1) and 3D asset pipeline — COMPLETE except device QA

Done:

- `npm run generate:ar` produces one GLB and one USDZ per artwork per size —
  96 pairs, 5.7 MB — plus a manifest the app reads. Per-size because neither
  Scene Viewer nor Quick Look can rescale at launch.
- `<model-viewer>` loaded only on request, with `ar-placement="wall"`,
  `ar-scale="fixed"` and a pre-built `ios-src`.
- Capability detection resolving to WebXR, Quick Look, Scene Viewer or an
  honest explanation — never a dead button.
- AR launch, status and failure instrumentation.
- `npm run check:ar` validates all 96 pairs against the advertised dimensions
  and Quick Look's structural requirements.

Outstanding: real-device QA on an iPhone and an Android handset. See
[AR device testing checklist](AR-DEVICE-QA.md) — orientation, flush mounting,
measured true scale and scale lock cannot be confirmed without a phone.

**Findings that changed the design**, each caught before shipping:

1. three.js's USDZExporter silently drops meshes carrying a material array,
   producing an archive with no geometry. A frame modelled as a second
   material would have shipped an empty AR experience to every iPhone. The
   frame is composited into the texture instead; one mesh, one material.
2. Scene Viewer and model-viewer's WebXR path rest a model's -Z extent against
   the wall without pitching it, so the back of the frame is authored at z = 0
   rather than centred.
3. Quick Look re-orients vertically-anchored content so local +Y becomes the
   wall normal. The USDZ bakes Rx(-90°) to cancel it; without that the artwork
   hangs facing into the wall while still opening normally.
4. The USD is written directly rather than through three.js, whose exporter
   re-encodes every texture to PNG — well over 100 MB across this catalogue.
   It is written against the exporter's exact output structure so the only
   deliberate difference is JPEG encoding.

### Phase 4 — Inquiry engine and contact — COMPLETE

- Inquiry form on a server action, working without JavaScript, validated on
  both sides, with a honeypot and per-address rate limiting that still points
  at WhatsApp when it refuses
- Resend delivery with a logged fallback, and `assertDeliveryConfigured()` so
  launch fails loudly rather than silently logging leads
- Artwork pages carry the piece into the form; WhatsApp deep links carry
  prefilled context
- Vercel Analytics and Speed Insights on Vercel only, GA4 only when a
  measurement id is set, AR funnel events instrumented

### Phase 5 — Signature pages: home, services, about — COMPLETE

- Home: a gallery-wall hero built from catalogue data, a wall-preview
  demonstration using the real scale component, collections, featured works,
  venue verticals and an inquiry band
- Services: alternating full-width panels, each with a representative piece,
  deliverables, typical timing and venue fit; four-step process band
- About: studio story, values, a materials section with real specifications
  and reasoning, and case studies marked as illustrative until real ones exist
- Parallax applied imperatively, transform only, desktop only — never
  `background-attachment: fixed`, which breaks on iOS Safari

### Phase 6 — Artwork customizer (on-screen) — COMPLETE

- Four frame finishes, drawn in CSS at the same proportion the AR texture
  composites, so preview and model agree
- Text-art configurator with live DOM preview: three voices, four inks, three
  grounds, type auto-sized to fit, unreadable ink/ground combinations flagged
- Configuration carried to the inquiry as readable query parameters and read
  back as a sentence

Known limit: AR models carry each artwork's default finish only. Generating a
model per finish would quadruple the asset matrix; the on-screen preview covers
finish choice instead.

### Phase 7 — AR tiers 2 and 3 — TIER 3 COMPLETE

Tier 3 (universal camera preview) is done: live overlay with drag positioning,
a freeze control, A4/Letter calibration for true scale, and honest labelling
that this is not tracked AR. Reachable from the same panel as real AR, so a
failed handoff always has somewhere to go.

Tier 2 was specified as a custom WebXR session. Research since established
that model-viewer's own WebXR path already performs wall placement with fixed
scale on Android Chrome and Samsung Internet, which is what tier 2 existed to
provide — so it is already shipped through tier 1. A custom session would add
only in-AR size switching and a bespoke reticle. That is now an enhancement to
consider after device testing, not a gap.

### Phase 8 — Hardening, content swap, launch

- Real artwork and brand content ingestion, AR model regeneration
- **Content-hashed artwork filenames.** Replacing an image in place leaves its
  URL unchanged, so browser and CDN caches keep serving the previous pixels —
  observed during Phase 2, where a stale cached variant rendered at the old
  aspect ratio. `next/image` rejects a query string on a local source (HTTP
  400), so cache busting has to go in the filename.
- Lighthouse: 90+ SEO and Best Practices; performance tuned on a throttled
  mid-range Android profile
- Accessibility pass; keyboard navigation and focus states
- Web-resolution USDZ only (iOS 26's Quick Look share sheet exposes the raw
  file); print-resolution masters stay private
- Domain go-live, content authoring guide, error monitoring

## Post-launch backlog

Out of scope now; the architecture leaves room for each.

- Admin panel for self-managed artwork uploads
- Customized artwork in AR (server-side USDZ generation)
- Urdu localization (`next-intl`, `dir="rtl"`, Noto Nastaliq Urdu)
- Paid iOS in-page AR via an App Clip-injected WebXR provider, if drag-on-wall
  AR on iPhone becomes a hard requirement
- Venue and style SEO guides
- Multi-piece gallery-wall planner
- Printable true-size templates
