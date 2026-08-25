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
- Verification harnesses: 31-viewport responsive audit, 259-check interaction
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
  twelve routes. All three score **100** on every route except the print
  template, whose two shortfalls are deliberate and recorded in
  [LAUNCH.md](LAUNCH.md).
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

### Phase 10 — frameless AR — ANDROID DONE, iOS AWAITING A DEVICE

**The GLB half is done.** Every pre-built model is now an alpha-masked plane
rather than a panel, so on Android and in the 3D view the visitor's own wall
shows between the letters. Verified rather than assumed: a word cloud renders as
cut words with the wall visible around and between them, at 0.90 × 1.20 × 0.000
metres for a portrait piece at Large — the zero depth being the signature of a
plane, which the interaction suite now asserts because `check:ar` deliberately
only validates width and height.

Two textures come out of the pipeline now, one per platform. The GLB takes a
transparent PNG; the USDZ keeps the opaque artwork-on-wall-tone texture it has
always had. That split is deliberate: Quick Look's handling of cutout alpha
cannot be confirmed without an iPhone, and shipping it unverified is exactly how
the empty-USDZ bug happened. **iOS therefore still answers "how big is this on my
wall" while Android answers "what does it look like on my wall".**

The alpha texture is an indexed 256-colour PNG, because it is embedded in every
size's GLB and so its weight is multiplied by four per artwork. Measured against
the unquantised version: a gradient mirror set drops from 268 KB to 71 KB for a
mean channel difference of 0.13 out of 255. At 128 colours the gradients band —
worst case 53 — so 256 is where the line sits. Total AR assets stayed at 9.6 MB
while gaining the honest model.

**Remaining, and it needs the phone:** an `opacityThreshold` on the USDZ shader
and the same plane geometry there. The device checklist covers what to look for.

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

### The inquiry never dies at the last step — 2026-08-26

Two defects on the only path to a sale on the site, one of them long-standing.

**The form emptied itself on any error.** React resets an uncontrolled form once
its action completes, and it does not care whether the action succeeded — so a
visitor who mistyped their email lost their name, city, wall size and the
paragraph they had just written about their space. The server now echoes the raw
submission back and the form re-seeds from it. Text inputs would very nearly
survive on `defaultValue` alone, because React updates the value attribute and
the reset restores to it, but a `<select>` will not: `defaultValue` on a select
sets `selected` on an option and that is not re-applied to a mounted element. So
each error carries a token and the form keys its fields on it, remounting them.
The interaction suite asserts retention, retention on the *same* error twice, and
that re-seeding never fills the honeypot — which would reject a real person's
second attempt.

**A failed delivery was a dead end.** Without `RESEND_API_KEY` the action
correctly refuses to claim success, but it then told the visitor to go and use
WhatsApp — with everything they had typed still on screen in front of them. Every
failure of a *valid* submission now returns a handover: the same inquiry composed
into a prefilled WhatsApp message and a prefilled email, built from the same
`renderLines` the notification email uses so the two cannot describe different
inquiries. Validation errors get no handover, because there the right move is to
fix the field.

The composition detail that matters on this site in particular: the URL budgets
are measured on the **encoded** length. `encodeURIComponent` turns one Urdu or
Arabic character into nine bytes of percent-escapes, so a decoded-length budget
would let an Urdu message produce a URL three times over the limit — and this site
puts Urdu into the artwork on purpose. Measured: a 3082-character Latin message
and a 2014-character Urdu one now both land at 3024 and 1585 characters of href.
Each channel also drops the contact handle it already carries — WhatsApp shows
the sender's number, an email shows their address — rather than spending URL
budget repeating it.

Also fixed here: `mailtoLink` gained a body, percent-encoded rather than
form-encoded, because `URLSearchParams` writes a space as `+` and a mail client
renders that literally. And `deliver.ts`'s docstring claimed an unconfigured
inquiry was "reported as delivered", which is the exact mistake its caller was
written to prevent.

### Printable true-size templates — DONE, 2026-08-26

Brought forward from the backlog, because the gap it fills is the one the whole
site is built around. True-to-size is the quality bar; AR delivers it in the page
on Android alone. An iPhone gets a handoff that still shows a panel, and the
desktop where a specifier actually works gets no AR at all. Paper has neither
constraint, and taping a template to the wall is what installers do anyway.

Route: `/portfolio/<slug>/template`, with `mode`, `size` and `paper` in the
query so every configuration is a URL somebody can forward to whoever owns the
printer. Every control is a link; the only client JavaScript is the print button.

Three modes, ordered by what they cost in paper:

- **Specification, one page.** The piece on its own wall tone, exact dimensions in
  centimetres and inches, the material with its spec and fire behaviour, the
  mounting, an elevation drawn against a standard 90 × 200cm doorway with the
  1.50m centre line marked, and the ordering process. The artefact a buyer
  forwards to whoever signs off, and the default because it costs one sheet.
- **Corner marks, four pages.** One corner of the piece per sheet at true size,
  with 10mm ticks, the edge lengths printed beside the mark, a key diagram, and
  the how-to on the first sheet.
- **Full template, 8 to 63 pages.** The piece tiled at true size as a grey
  silhouette, with dashed trim edges only where a neighbour continues, and a
  row/column/sheet label in a strip outside the trimmed area.

The technique that makes it work: every measurement inside a sheet is a
percentage of the sheet, never a length. On screen the sheet is a box with the
paper's aspect ratio at whatever width fits; in print it is the paper's real size
in millimetres. The composition is identical because nothing inside knows which
it is in. Sizing in millimetres and scaling the preview would need a scale factor,
and CSS cannot divide a length by a length — so that factor would have to come
from JavaScript and a resize listener.

Decisions worth keeping:

- **Sheet orientation is measured, not assumed.** Rotating a sheet does not change
  its area, so the saving is all in remainder packing — and the intuition is
  backwards. A 200 × 80cm panorama is 33 A4 sheets in portrait and 40 in
  landscape. `tileLayout` computes both and takes the smaller.
- **Every sheet carries a 100mm bar,** not just the first. Sheets get reprinted
  singly, and "fit to page" is one click away in every print dialog and shrinks
  the page by about 6% — 7cm on a 120cm piece.
- **The label strip is subtracted before the tiling is computed,** in the geometry
  module, so a label can never end up inside the region that gets trimmed off.
- **The silhouette, not the real colours.** A piece lettered in bone for a dark
  wall would print as nothing on white paper, so every piece prints as the same
  grey mask — which also costs a fraction of the toner.

Four bugs the gates caught that inspection had not:

1. `container-type: inline-size` on the sheet with `cqw` type on the same
   element. An element cannot query its own container, so the cqw resolved
   against the viewport instead — 1% of 1440px rather than 1% of a 210mm sheet,
   making every measurement 1.8x too large. Moving the `font-size` to a
   descendant fixed it.
2. A percentage height on the elevation SVG, whose parent was content-sized. The
   percentage was ignored, the SVG took its viewBox's intrinsic height, and on a
   near-square piece that pushed the block 40mm off the page. Now `em`, which is
   tied to a fixed physical type size.
3. The calibration bar's percentage width sat on a child of a shrink-to-fit
   wrapper, so it resolved against a width derived from its own content. Moved to
   the flex item, whose containing block is the printable area.
4. Two `h1` elements on the spec page, and a 70%-opacity sheet count on the mode
   chips that failed contrast.

`npm run check:print` measures it in print media — sheet and PDF page boxes in
millimetres, the bar at exactly 100mm, nothing clipped, one PDF page per sheet,
and a pixel count proving the tiled sheets are not blank. That last threshold is
2%, chosen from measurement: with the artwork made invisible the rules and labels
alone cover 0.47%, and the real cases cover 7.0% and 26.6%.

Not done, and worth doing if paper cost ever matters: **skip interior sheets that
contain no ink.** A tiled portrait piece has genuinely blank sheets top and
bottom, and analysing the artwork's alpha per tile at build time could drop them.
It complicates the sheet numbering, so it is not free.

## Post-launch backlog

Out of scope now; the architecture leaves room for each.

- Admin panel for self-managed artwork uploads
- Full Urdu site localization (`next-intl`, `dir="rtl"` throughout) — distinct
  from Phase 9, which puts Urdu into the artwork rather than the interface
- Paid iOS in-page AR via an App Clip-injected WebXR provider, if drag-on-wall
  AR on iPhone becomes a hard requirement
- Long-form venue and style guides for search
- In-AR size switching via a custom WebXR session, if device testing shows
  model-viewer's own path is not enough
