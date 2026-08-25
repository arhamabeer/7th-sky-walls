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

### Phase 2 — Immersive portfolio and artwork pages — COMPLETE

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
- Previous/next navigation between pieces, wrapping within the collection
- Editorial grid: uniform row heights so captions align across differing
  proportions, panoramic works spanning two columns so a 5:2 canvas gets width
  to read rather than shrinking to a sliver, and every piece matted to its box
  rather than cropped to fill it
- Collection landing pages, plus a collections index
- Verification harnesses: 31-viewport responsive audit, 234-check interaction
  test suite, image dimension guard

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

### Phase 8 — Hardening, content swap, launch — IN PROGRESS

Done:

- Lighthouse runner gating SEO, best practices and accessibility at 90 across
  eleven routes. All three now score **100** on every route.
- Two real contrast defects and one heading-order defect fixed, found by the
  audit rather than by eye.
- Performance work driven by measurement: dropped the display font's
  optical-size axis, stopped preloading the configurator's typeface, made the
  smooth-scroll library a dynamic import so phones stop downloading it, and
  removed the animation library entirely in favour of CSS.
- **Error boundaries at three levels.** There were none, so any runtime error
  in a client island replaced the page with Next's own "Application error"
  screen — the wrong failure mode on a site whose signature feature is
  client-side. `error.tsx` retries the segment, `global-error.tsx` covers the
  root layout and sets the brand itself, and `FeatureBoundary` contains a
  failure to one panel so a lost preview does not cost the inquiry. All three
  were triggered deliberately to confirm they work; the method is recorded in
  the launch checklist.
- **Keyboard access, properly tested.** Lighthouse scores accessibility 100 and
  never presses Tab. Behind that score, both modal overlays declared
  `aria-modal="true"` with nothing keeping focus inside them, and form fields
  had suppressed the site's focus outline in favour of a 1.73:1 halo. Both are
  fixed and both are now covered by tests that were confirmed to fail without
  the fix.
- A branded not-found page, because a dead end on a portfolio is a lost
  inquiry. The audit checks the HTTP status of every route, with this one
  declared as expecting 404.
- [Launch checklist](LAUNCH.md) covering the automated gates, the content and
  environment work, and post-deploy verification.

Remaining: real content and credentials, device testing, go-live.

Full list:

- Real artwork and brand content ingestion, AR model regeneration
- ~~**Content-hashed artwork filenames.**~~ Done. Every artwork is served from
  `/artworks/<slug>.<hash>.jpg`, where the hash is of the image bytes, and the
  generator rewrites `artworks.json` and prunes the old revision. Replacing an
  image in place used to leave its URL unchanged, so browser and CDN caches
  kept serving the previous pixels — observed during Phase 2, where a stale
  cached variant rendered at the old aspect ratio. `next/image` rejects a query
  string on a local source (HTTP 400), so the cache key had to be the filename.
  The authoring workflow is unchanged: drop `<slug>.jpg` and the script does
  the renaming.
- ~~Lighthouse: 90+ SEO and Best Practices~~ — 100 on both across eleven
  routes. Performance is 76–97 on the throttled mobile profile, with the
  remaining cost being the artwork imagery itself.
- ~~Accessibility pass; keyboard navigation and focus states~~ — done, see
  above.
- Web-resolution USDZ only (iOS 26's Quick Look share sheet exposes the raw
  file); print-resolution masters stay private
- Domain go-live, content authoring guide, error monitoring. The boundaries log
  with the error digest, which is what correlates a report to the server log;
  choosing a reporting service is a decision for the studio (queued in
  [QUESTIONS.md](QUESTIONS.md)).

## Built beyond the original plan

Both were in the post-launch backlog and both were brought forward, because
they are what the competitor research identified as uncontested ground.

### Venue landing pages (`/spaces`, `/spaces/<venue>`)

Venues were filter values; they are now pages. Each covers what actually
changes about specifying art in that kind of space — downlights and glare in
offices, seating heights and phone cameras in cafés, contact damage and fire
rating in schools — alongside the pieces we would put forward first, the
services that apply, the materials that suit, and a scale preview set in that
room.

Every studio in this space offers venue categories; every one fills them with
a product grid. The considerations are the difference, and they are what a
procurement conversation turns on.

### Gallery wall planner (`/planner`)

Answers the question that follows "which piece" for anyone furnishing a space
rather than a room. Real wall dimensions in, arrangement out, checked against
the wall — so the answer is either "it fits" or a specific statement of by how
much it does not. Hanging conventions are stated rather than assumed, and the
arrangement travels to the inquiry written out in full.

## Product category corrected, 2026-08-25

Reference photographs of the studio's actual work arrived after the ninth
question was answered, and they changed what is being built. The work is **cut
dimensional lettering** — raised letters and word-cloud panels mounted on office
walls — not printed pictures. The catalogue had been abstract prints and
gradients throughout.

What that changed, and why each was not optional:

| Was | Is | Because |
| --- | --- | --- |
| Six painting series | Word Clouds, Statement Walls, Line & Wire, Values Boards, Sacred Lines, Brand Walls | The collections were categories of image; these are categories of made object |
| Opaque JPEG artwork | PNG with alpha and no ground | Cut lettering has no substrate. The letters are the artwork; the wall is the room's |
| Site surface behind every piece | Each piece's declared `wallTone` | A white-lettered piece is invisible on a white tile, and that is a property of the installation |
| Canvas, cotton rag, wall covering | Acrylic, PVC foam, MDF, brushed aluminium, printed PLA | The old specs describe printing. Researched, and **awaiting the studio's confirmation** — see QUESTIONS 7a |
| Four frame finishes | Four mountings: flush, 12 mm, 25 mm, backer panel | There is no frame. What a customer chooses is the standoff, which is what the shadow is a function of |
| Framed panel in AR | Panel on the piece's wall tone | An interim step: see Phase 10 |

Reference images were not taken from the web. They are other studios' products
and photographs, and putting them in this portfolio would claim work this studio
has not done. Six generators draw the style instead, from measured font metrics,
until real installation photography arrives.

## Confirmed on 2026-08-25, awaiting go-ahead

Nine queued questions were answered (see [QUESTIONS.md](QUESTIONS.md)). Six
confirmed what already exists; three add work. Two of those are small and
belong to Phase 8. The other two are new phases, because Urdu was promoted from
the post-launch backlog into the build.

### Phase 8 additions — small, no new phase needed

1. **Client error reporting to an internal route.** The boundaries log a digest
   and nothing collects it, so a failure a visitor hits is invisible. Decision
   was an own endpoint rather than a third-party service: no paid dependency, no
   external processor of visitor data, and the existing rate limiter guards it.
2. **The inquiry form must stop reporting success when it cannot deliver.**
   Direct channels carry inquiries until Resend is configured before production.
   Until then a submitted form is written to the server log and still tells the
   visitor it was sent, which loses inquiries silently — the one failure mode
   that must not reach launch.

### Phase 9 — Urdu and Arabic in the configurator — COMPLETE

Confirmed: both scripts, in the faces each is actually written in.

| Script | Face | Notes |
| --- | --- | --- |
| Urdu | Noto Nastaliq Urdu | 400–700 plus variable, `arabic` subset |
| Arabic | Amiri, or Noto Naskh Arabic | Quranic and classical wording belongs in Naskh |

Both `preload: false`. An Arabic Nastaliq subset runs to roughly 150–250 KB,
which must never touch the initial load — it downloads when the configurator is
opened and that face chosen, and not before.

Done. `dir="auto"` on both the field and the preview, so mixed Urdu and English
resolves per paragraph without a manual toggle and the caret lands on the right
side while typing. Line height is per face rather than shared — Nastaliq needs
about 2.1 against a Latin face's 1.22 and clipped its own descenders at the
shared value — and the fit calculation takes it, so three lines of Urdu no
longer overlap.

**The wording reaches AR.** Nastaliq shaping has no working server-side path, so
the browser does it: the same canvas that draws the preview feeds a GLB authored
in the browser, which model-viewer and the WebXR path both accept. Verified end
to end — "پیاری دیوار" shaped and joined in the 3D stage, at 0.90 × 1.20 m for
Sabr at Large. iOS still receives the pre-built USDZ, and the panel says so.

Both faces confirmed absent from the initial load: a home page fetches two font
files, and the Nastaliq subset arrives only when the Urdu voice is chosen.

Nine checks cover it, per script: the real face rather than a fallback,
direction on the field and the preview, no clipping, more line height than a
Latin face, and the model built at true size.

### Phase 10 — frameless AR, then customer wording in AR

**First, and smaller than it sounds:** AR still models each piece as a panel
carrying the artwork on its wall tone. For cut lettering the honest model is a
plane with an alpha-masked texture and no panel at all, so the visitor's own
wall shows between the letters. That needs `alphaMode: "MASK"` in the GLB, an
`opacityThreshold` on the USDZ shader, and the geometry switched from a box to a
plane — plus confirmation of how Quick Look handles cutout alpha, which takes an
iPhone. It is deliberately not done unverified: that is exactly how the
empty-USDZ bug happened, and it shipped nothing visible to every iPhone.

Confirmed in scope. No configurator text reaches AR today, in any script,
because assets are built ahead of time and a customer's words are not known
then.

**The 3D is the easy half.** Nastaliq is among the hardest scripts to shape, and
the obvious server-side renderers do not do it: Satori, which Next.js uses for
images, has no full shaper, so rendering Nastaliq in a function would mean
headless Chromium or hand-wired HarfBuzz.

Proposed instead: let the browser shape it. It already does this correctly and
has already loaded the face for the preview. Compose the texture on a canvas
with `fillText`, which goes through the same text stack, and build the GLB and
USDZ from that — the USDZ packer is pure JavaScript over fflate and runs
client-side unchanged, baked rotation and vertical anchoring included.

**Verification gates this phase, not planning.** Whether iOS Quick Look accepts
a `blob:` URL as `ios-src` is unknown and decides the architecture: if it does,
this needs no server at all; if it does not, the generated USDZ is POSTed to a
small route that serves it back with `model/vnd.usdz+zip`. That question gets
answered on a real iPhone before the phase is committed to, alongside the
existing device QA.

## Post-launch backlog

Out of scope now; the architecture leaves room for each.

- Admin panel for self-managed artwork uploads
- Full Urdu site localization (`next-intl`, `dir="rtl"` throughout) — distinct
  from Phase 9, which puts Urdu into the artwork rather than the interface
- Paid iOS in-page AR via an App Clip-injected WebXR provider, if drag-on-wall
  AR on iPhone becomes a hard requirement
- Long-form venue and style guides for search
- Printable true-size templates
- In-AR size switching via a custom WebXR session, if device testing shows
  model-viewer's own path is not enough
