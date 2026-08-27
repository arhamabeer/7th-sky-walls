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
  `/artworks/<slug>.<hash>.png`, where the hash is of the image bytes, and the
  generator rewrites `artworks.json` and prunes the old revision. Replacing an
  image in place used to leave its URL unchanged, so browser and CDN caches
  kept serving the previous pixels — observed during Phase 2, where a stale
  cached variant rendered at the old aspect ratio. `next/image` rejects a query
  string on a local source (HTTP 400), so the cache key had to be the filename.
  The authoring workflow is unchanged: drop `<slug>.png` and the script does
  the renaming. PNG, not JPEG — these pieces are cut lettering with no
  substrate, so the file carries alpha and the wall behind it belongs to the
  room. `readMaster` looks for the plain `.png` name only, so this paragraph
  saying `.jpg` was an instruction that silently did nothing.
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

### What AVIF actually cost, and what the audit was really waiting for — 2026-08-27

Enabling AVIF broke the responsive audit, and chasing that turned up a real cost
that had been guessed at rather than measured, plus two bugs in the audit itself.

**The cost, measured against the deployment.** A cold AVIF variant on production
takes 0.87-1.6s end to end where a warm one takes 0.39s, so the encode adds
roughly half a second to a second — once per variant per region, paid by whoever
arrives first. Against that, everyone after them gets about 40% of the WebP bytes:
`/portfolio` went from 444KB of images to 215KB, a second of transfer saved on a
1.6Mbps connection, on every visit. A per-visit saving against a
once-per-region cost is worth taking, and the numbers are now in `next.config.ts`
so the decision can be re-examined rather than re-argued.

**Why it broke the audit.** Locally the optimizer encodes in-process and does not
parallelise: a cold AVIF at 1080px takes about a second, and a page with thirteen
pieces kept the network busy past `networkidle`'s patience. The audit failed with
a navigation timeout on a page that curl serves in 35 milliseconds.

The fix was one line. Getting there took three attempts, two of which were my own
mistakes and are recorded because they were instructive:

1. **`networkidle` was the wrong wait, and that was the whole bug.** It waits for
   the network to go quiet; this audit measures layout. Playwright's own
   documentation advises against it. `load` does not care how slow an image
   optimizer is, and with that one change the full 620 checks pass.
2. **Warming the image cache first cost more than it saved.** 280 variants at
   concurrency six took 5.6 minutes, and then Chromium crashed under the load.
3. **Waiting for every image to be `complete` was unsatisfiable**, which took
   three rounds to see. The hero renders both its large-screen wall and its
   small-screen row and hides one with CSS, so on a phone six images sit in a
   `display: none` subtree, lazy and correctly never loaded. Filtering those out
   left six more in the grid, laid out but `0x0` — an unloaded `w-auto` image has
   no intrinsic size — and equally never coming. Removed; the audit's own scroll
   pass already resolves what its checks measure.

That third attempt also produced a report that lied. A never-started image has no
`currentSrc`, so falling back to `src` reported next/image's no-srcset fallback —
the 3840px candidate — and the finding read as though a phone were fetching a
3840px file. Nothing was: the widest request on that page is 640, confirmed by
recording every request the page makes. Worth writing down, because "phone
downloads 3840px image" is exactly the kind of finding that gets acted on before
it gets checked.

Net effect on runtime: the mobile matrix went from hanging entirely, to 330
seconds with the wait, to 134 seconds without it.

What worked instead: the audit asks the optimizer for WebP. Not a shortcut around
production — a separation of concerns. It measures overflow, touch targets,
contrast, heading order and whether artwork sits in a shadowed box, none of which
depends on the codec, and its image checks read widths and URLs rather than
pixels. AVIF is verified on its own terms: alpha and fidelity against the encoder
directly, and the format actually served against the deployment.

### Thirty-one per cent of the template's sheets were blank — 2026-08-27

Noted as a follow-up when the printable templates landed, then measured, and the
measurement was worse than the guess.

A piece is cut letters on a bare wall, so a short word in the middle of a large
rectangle leaves big empty margins — and tiling the rectangle printed those
margins as blank sheets. Across every piece and every size: **933 of 2,982 tiled
sheets had no ink on them at all, 31%.** The worst case was Name in Gold at Large,
29 blank out of 35: somebody feeding thirty-five sheets through a printer for six
sheets of content.

`npm run generate:placeholders` now measures each piece's ink bounding box from
its alpha channel while the pixels are already in hand, and writes it to
`src/content/ink-bounds.json` beside the blur map. `tiles()` returns only the
tiles that overlap that box, plus a count of what it left out.

| Piece at Large | Was | Now |
| --- | --- | --- |
| Name in Gold | 35 | 6 |
| Bismillah | 35 | 12 |
| Sabr | 25 | 10 |
| Lobby Wordmark | 40 | 20 |
| Growth Arrow | 25 | 25 |

Growth Arrow is the control: its ink fills its rectangle, so nothing is dropped.

Details that make it safe rather than clever:

- **Alpha above 8, not above 0.** The generators antialias, and one pixel at
  1/255 opacity would stretch the box to the full canvas and make the whole
  measurement silently useless.
- **Overlap, not containment.** A tile catching any part of the inked area is
  printed.
- **No ink means print everything.** A piece with no ink cannot happen, but the
  wrong way to fail is a template missing part of the artwork.
- **Sheets are numbered by printed position**, because that is the number you can
  count off the stack coming out of the printer, while the row and column say
  where each one goes. The first sheet also states how many were omitted.

The check that matters is not the saving but the honesty of the count: it is the
number of sheets somebody is about to feed through a printer. Computing it twice
is how it disagrees with itself, and that happened during the build — the chip
advertised the unfiltered grid while the button beside it printed the filtered
set. `check:print` now asserts that the advertised count is the printed count, and
that printed plus omitted accounts for the whole grid. Reverting the filter fails
it with all three numbers: "the button advertises 35 sheets but 6 render".

### The planner did not follow its own advice — 2026-08-27

The planner prints three rules beside itself. Two it kept and one it ignored.

Its notes said an arrangement spanning more than about two thirds of a wall loses
its impact. The planner said nothing at all until 85%, so an arrangement covering
80% of a wall was called a mistake by the advice printed next to it and accepted
in silence by the tool. There are two different things to say there, so there are
two notes now: a gentle one from two thirds, quoting the share the arrangement
actually takes, and the firmer existing one once the clear wall runs out. Removing
the new band fails the check that exists for it.

The gap was consistent — 12cm, inside the 10-15cm the notes recommend — but
nothing kept them that way. Both figures, and the two-thirds share, now come from
`content/hanging.ts` alongside the eye level, and the notes interpolate them rather
than restating them. That module now holds every number describing how a piece
meets a wall, which is the third time this week that one fact written in two
places has been the defect.

Also checked and correct, so it is written down rather than looked at again: the
AR analytics event names against what the documents promise, the camera preview's
paper dimensions (A4 21 × 29.7, US Letter 21.6 × 27.9), that all four size tiers
of a piece share its proportions so nothing is cropped to fit, and that
`ar-scale="fixed"` is set so the claim that a placed piece cannot be resized is
true.

### The camera preview's scale was never checked — 2026-08-27

The camera overlay is the AR tier every device can reach, and its whole claim is
true size: the visitor stretches a dashed guide to match a real sheet of paper
held against the wall, that gives pixels per centimetre, and the piece is drawn
at its real dimensions in those pixels.

Nothing checked the number. The existing camera checks cover that the overlay
opens, traps page scroll, and says plainly that it is not tracked AR — all of
which stays true while the piece is drawn at the wrong size, which is the one
thing that panel exists to get right.

Four checks now, and they are exact rather than approximate because the
arithmetic is: a 210px guide across a 21cm A4 sheet is 10 pixels per centimetre,
so a 90cm piece is 900px. They also assert that the piece is described as
"approximate" *before* calibration rather than claiming a scale it does not have,
that the label names the sheet it was calibrated against, and that choosing US
Letter uses 21.6cm rather than A4's 21 — a 3% error is 2.6cm on a 90cm piece, and
a sheet chooser that does not change the result is decoration.

Confirmed by breaking it: calibrating against the sheet's *height* instead of its
width — a slip that renders perfectly and looks plausible — draws the piece at
636px instead of 900px, 29% small, and two of the four checks fail with both
numbers in the message.

### Share cards, duplicate pieces, and an AR pipeline that could not be trusted — 2026-08-26

Four defects found by looking at the share cards, which nothing had checked since
the catalogue was rebuilt.

**Every panorama's share card was cropped to unreadable.** `buildOgCard` used
`fit: "cover"` with `position: "attention"` — which fills the panel and discards
whatever does not fit. On a 5:2 piece that is 57% of the width, and "attention"
puts the surviving crop in the middle of a word: Ask Better Questions read
"BETTER / TIONS", cut off at both ends. Six of twenty-eight pieces are panoramas,
and a share card is the first thing anyone sees of this studio on WhatsApp. Now
matted against the piece's own wall colour, which is the rule the gallery tile
already follows and states in its own docstring: cropping an artwork
misrepresents the piece being sold.

**Four pieces were two images.** `lineArtBulbs` never touches its RNG — every
stroke comes from the words, the canvas and the palette — so Hanging Goals and Six
Questions, identical in orientation and wall tone, generated byte-identical
artwork, as did Lit and Bright Ideas. Content-addressed filenames hid it
perfectly: identical bytes get one filename and the two pieces quietly share a
file. Each piece has its own word set now, which is better content anyway — Six
Questions holding who/what/when/where/why/how is the piece its title describes.
The generator also fails outright if two pieces ever produce the same bytes again.

**Bright Ideas' alt text described six bulbs and the image had four**, because the
landscape pieces take four and the alt was written for the panorama.

**`generate:ar` was not idempotent.** USDZ is a zip and fflate stamps each entry
with the clock, so every run rewrote all 112 USDZ files — about 5MB of churn
whether or not anything had changed. A fixed mtime makes two consecutive runs
byte-identical, and that is what made this batch legible: with the noise gone, the
sixteen GLBs that changed were exactly the four pieces that needed to change.

**And `check:ar` could not see a stale texture.** It validates that every model
encodes its advertised size and is shaped the way Quick Look needs — all of which
stays true when the texture inside is a previous version of the piece. So four
pieces' AR models went on showing the old image with every check passing. The
manifest now records the artwork URL each model was built from, and since that URL
carries a hash of the image bytes, comparing URLs compares the images. Pointing an
artwork at a different hash without regenerating fails by name.

The image-sizing check also turned out to be flaky — it passed standalone and
failed inside `verify` on the same build. Several of these images sit in boxes
whose height comes from the text beside them, and an `object-contain` image in a
height-capped box takes its width from that height, so a card measured mid
font-swap is a few pixels different and a few pixels either side of a
candidate-width boundary flips the verdict. It waits for `document.fonts.ready`
now, and three consecutive runs agree.

### The customisable pieces could not be browsed — 2026-08-26

Seventeen of the twenty-eight pieces can be reset with the customer's own
wording, in Urdu set in Nastaliq, Arabic set in Naskh or Latin. That is the
studio's clearest differentiator in its own market, and there was no way to see
which pieces had it: the capability was discoverable only by opening a piece and
finding a tab.

`/portfolio?words=yes` now filters for them, as a plain crawlable link like the
venue and collection filters, composing with both rather than replacing them. The
chip carries a line naming the three scripts, so the capability is stated on the
index rather than waiting to be found.

A dedicated landing page was considered and rejected: `/services` already has a
Calligraphy & Typography section, and a second page would have competed with it
for the same search intent — the mistake About and the new materials page were
just untangled from. The missing thing here was an affordance, not a page.

Four checks: that it narrows, that it composes with a collection rather than
replacing it, that the active chip is marked for assistive tech, and that pressing
it again clears it — a toggle rendered as a filter chip fails by deep-linking into
a state with no way out.

### Every index page was fetching four to seventy times the pixels it painted — 2026-08-26

Performance had never been gated — the bar was 90+ on SEO, best practices and
accessibility — so it was measured properly for the first time. Lighthouse's
number turned out to be the least useful part of the answer.

**First, what was not wrong.** The artwork page's LCP under Lighthouse's own
throttling profile (1.6Mbps, 150ms RTT, 4x CPU) measures **1724ms** across five
runs, comfortably inside the 2.5s "good" threshold. Lighthouse reports 3.5s
because it simulates rather than measures. Chasing that number would have been
optimising the metric.

**What was wrong is `sizes`.** `next/image` picks a candidate width from the
`sizes` attribute, so `sizes` has to describe the rendered image. Here it
described the *card* — and every artwork is `object-contain` inside a padded,
often height-capped box, so the painted width is much smaller than the card:

| Page | Viewport | Painted | Fetched | Pixels |
| --- | --- | --- | --- | --- |
| /planner | phone | 53×71 | 1080px | **61x** |
| /portfolio/sabr | phone | 64×64 | 1080px | 42x |
| /spaces/office | phone | 77×103 | 1080px | 29x |
| /collections | laptop | 132×176 | 750px | 32x |
| /portfolio | desktop | 247×329 | 640px | 6.7x |

195 of 289 measured images were over-fetching beyond 4x in area. All of them are
now within one rung of the candidate ladder, verified across 286 images on nine
pages at four viewports. `/collections` went from about 455KB of images to
**177KB**; the planner from a 61x over-fetch to 64KB for the page.

Two lessons in *how* to express `sizes`:

- Where the box has a fixed height — the collections covers, the home collections
  row — the painted width is the box height times the piece's aspect and does
  **not vary with the viewport at all**. A vw value can only be wrong there. Both
  now compute an exact pixel value from `getOrientationAspect`.
- Where an element is capped with `max-w`, vw is wrong above the cap in both
  directions: the hero's centre frame was simultaneously over-served on a phone
  and *under-served* at tablet, which is the worse failure — a soft image on cut
  lettering is the product looking cheap.

**`priority` was tried and reverted.** The remaining LCP on the grid pages is not
about image size — the images are ~25KB each now — it is about when they can
start. Fourteen resources begin at 187ms: two fonts at 60KB and ten framework
chunks at 166KB, and on a 1.6Mbps pipe the images wait behind them. Preloading
the first card measured neutral to slightly worse on `/portfolio` and
`/collections`, and on every page where the grid sits below the fold it *added*
66KB by eagerly loading something that had been lazy. Reverted.

Moving that number further means fewer bytes of font and framework before first
paint, which is an architectural question rather than an attribute, and is left
written down rather than half-done.

`npm run check:images:sizes` gates both directions — under-fetching as an error,
over-fetching beyond 6x as a failure. 6x rather than 4x because the ladder's own
step from 128 to 256 is already 4x in area, so a stricter gate demands precision
`sizes` cannot express. Its first version measured every page in one browser
context and blamed the markup for the HTTP cache: Chrome reuses an
already-downloaded larger candidate rather than fetching a smaller one, so a 48px
thumbnail whose `sizes` was perfectly correct reported a 1080px fetch. Each page
is measured as a cold arrival now.

### Three more stale facts, and a gate for the class — 2026-08-26

The dominant defect in this codebase is one fact written down in two places. Four
have been fixed today — the material count, the fire rating, the hanging height,
the mounting — so the remaining candidates were hunted deliberately rather than
waited for.

- **"Six curated series", twice,** on the home page and the collections page,
  while `collections.json` holds seven. Mirror Acrylic was added and the sentence
  was not. The count is gone rather than corrected, which is the same fix the
  "four surfaces" copy got and for the same reason.
- **The AR device checklist opened by naming a piece that does not exist.** "Use
  "Minaret Dawn" or **Begin Anyway** for the first run" — Minaret Dawn belonged
  to the catalogue the product-category rebuild replaced. A checklist whose first
  instruction names something missing is a checklist nobody finishes. It now says
  Sabr, and says why: the brass flourish sits beneath the word, so a flipped model
  is obvious without reading anything, which is the point on a phone held at arm's
  length. Every other factual claim in that document was checked at the same time
  and all of them hold — Sabr and Idea are both portrait, Ask Better Questions is
  the panorama, Idea is the word cloud, Name in Gold takes custom wording.
- **The About page hardcoded "Founded 2024"** while `site.config` holds
  `foundingYear`, which is what the LocalBusiness structured data reads. They
  agreed — but the launch checklist asks the studio to set the real year in the
  config, so the page would have gone on telling visitors 2024 while telling
  search engines something else.

`check:slug-refs` now covers titles in the docs as well as slugs in the code.
Only **bold** phrases are checked, because that is how these documents mark
something to open or click; matching every capitalised phrase in a design document
against the catalogue finds nothing but false positives. Putting "Minaret Dawn"
back fails it by name.

### Five pieces were overruled about their own mounting — 2026-08-26

`defaultMountFor` infers a mounting from a piece's material, which is the right
behaviour for a piece that does not say. Five of the twenty-eight did say, and the
inference ran first anyway.

Three MDF pieces asked for a backer panel; MDF matches none of the material
regexes, so they fell through to the `MOUNTS[1]` default — a 12mm standoff. Two
mirror pieces asked to sit flush, and `/acrylic/i` matched "Mirror acrylic" and
gave them a 12mm standoff too.

The consequence lands on the document a client forwards for sign-off: the printed
specification named the backer panel on its material row and a 12mm standoff on
its mounting row, two lines apart. On screen, a piece specified flush was
previewed with a 12mm shadow.

What a piece says now wins over what its material implies, and two build-time
checks in the content layer keep the two from separating again:

- Every material string an artwork names must exist in `materials.json`. Nothing
  enforced that, and a mismatch does not fail loudly — it silently prints a
  specification with no material spec and no fire behaviour on it, which is the
  one column that page exists for.
- Every piece that names a mounting must resolve to it. Restoring the
  inference-first behaviour fails the build naming the piece and both numbers,
  which is how both checks were confirmed to be load-bearing.

Also here: the About page hardcoded "Founded 2024" while `site.config` holds
`foundingYear`, which is what the LocalBusiness structured data reads. They agree
today — but the launch checklist asks the studio to set the real year in the
config, so the page would have gone on telling visitors 2024 while telling search
engines something else. It reads the config now.

### One hanging height, not three — 2026-08-26

The planner advises where the centre of an arrangement sits, the specification
sheet prints it, and the corner-marking instructions tell an installer where to
mark it. They did not agree.

`EYE_LEVEL_CM = 145` was declared twice — once in the room-scale preview, once in
the planner's layout maths — and the specification sheet, written this week,
introduced a third number under a third name: `CENTRE_HEIGHT_CM = 150`. So
somebody who read the planner's advice and then printed a sheet from the same site
got 145cm on screen and 1.50m on paper for the same convention. The prose stated
both numbers as literals, which is how it drifted without anything noticing.

There is now one declaration, in `src/content/hanging.ts`, importing nothing so
that the copy file, the layout maths, the preview and the print components can all
read it without a cycle. The prose interpolates it rather than restating it. 145cm
is the value that survived: it is the gallery convention — 57 inches to centre —
and it is the number the planner's researched notes already used.

Three checks assert the rendered result across the planner, the sheet and the
corner marks, because that is what a specifier compares. Making the metre form
disagree with the centimetre form by five reproduces the original bug exactly:
planner 145, sheet 150, corners 150.

Also swept while looking: every route was driven with the values a hand-edited
link, a stale bookmark or a crawler actually produces — unknown filter values,
repeated parameters, 2000-character filters, script tags in the wording, path
traversal in the template's parameters, a 3000-character plan. Thirty cases, all
correct: 200 where a fallback applies, 404 where the thing is missing, nothing
injected, no horizontal overflow, no console errors.

### A specification page of its own — 2026-08-26

`/materials`. Two pages tell the reader that fire rating is the first thing a
facilities manager asks, and the answer had been living halfway down the studio
biography on About — which is not something a specifier can forward to a
procurement officer. The venue pages linked to `/about` for material detail;
they now link here.

The page is a comparison table, then the six detail cards, then how each fixes
to the wall, built from `materials.json` and `MOUNTS` so nothing on it is
authored twice.

Two fields were added to every material to make the table possible, and both are
**restatements of the researched prose, never additions to it**:

- `fireShort` — the fire behaviour in three or four words. The long form is what a
  specifier reads; this is what they scan across six materials before deciding
  which paragraph to read.
- `depthMm` — how far the finished letter stands off the wall. Depth rather than
  sheet thickness, because for cut lettering they are not the same number and
  depth is the one that casts the shadow. Aluminium is a 3 mm face on 15 mm
  returns, so its depth is 15.

Both are required in the schema, so a material cannot enter the table with a blank
cell in the column the table exists for.

About no longer carries its own copy of the cards. It shows the same table and
links here — the previous arrangement duplicated every word of `why` and `fire`
on a second URL, which reads to a search engine as two pages competing to answer
one question and to a maintainer as two places to update. The table is shared as a
component for the same reason.

The audit found three defects in it that inspection had not:

1. The scroller used the full-bleed `-mx-4 px-4` trick inside `Container`, which
   made it wider than its own parent — reported as both a clipped parent and text
   extending past the viewport, on every phone. Removed; there is nothing to bleed
   past inside the container's width.
2. The table's material links were 19–39px touch targets.
3. Rather than scroll a four-column table sideways on a phone, "Best for" is
   hidden below `sm` — it is the widest column and it is already on every card.
   Three columns fit a 320px phone with no scrolling at all.

Six checks cover it, including that the table and the cards hold the same number
of materials and that no row links to an anchor that does not exist. Dropping one
card fails both.

### The last of the print-era copy, including a fire claim — 2026-08-26

The catalogue and the materials list were rebuilt for cut dimensional lettering.
The services and venue copy was not swept with them, so the site went on
describing a printing business in six places — and one of them was a claim a
procurement officer would rely on.

- **The school page said "our wall coverings are Class B fire-rated."** There is
  no wall covering in `materials.json`, and the rating contradicted the page the
  same site links to for material facts. It now says what the materials page says:
  PVC foam is self-extinguishing and thin gauges reach Class A under ASTM E84.
  The same page recommended "aluminium composite or wall covering rather than
  stretched canvas" at pupil height, against two products that are not offered
  and one that is not stocked; it now recommends PVC foam or aluminium over MDF,
  which is what the material research actually supports.
- **The services page** offered "archival large-format production" and a "choice
  of canvas, acrylic, aluminum or fine-art paper", and listed "printed wall
  coverings" alongside murals. Rewritten to in-house cutting, routing and
  finishing, and to the four materials the site documents. Murals are kept — they
  are in the site's own strapline and need no sheet material — but the
  wall-covering claim is removed rather than corrected, because correcting it
  would mean inventing a spec and a fire rating. Logged as question 7b so a
  possible revenue line is not deleted silently.
- **"Hand-embellished finishes available"** is a print-era upsell. Replaced with
  "Urdu, Arabic or Latin script", which the studio genuinely does since Phase 9.
- **The office and café pages** compared their materials against canvas. They now
  compare against materials the site stocks, using the reasoning from
  `materials.json`: a matte acrylic face under downlights, and PVC's indifference
  to humidity where MDF's is not.
- **The "Produce" process step** said "printed and finished in-house on archival
  materials". It appears on the services page and, since this week, on the printed
  specification sheet.
- **`artworkSurface: "Canvas / fine-art paper"`** in the artwork JSON-LD. Removed
  rather than replaced: these pieces mount to the wall itself, so there is no
  supporting sheet to name, and an absent optional property beats a false one.

Two more stale counts went with them — `materials.json` described PVC as "the
best fire performer of the five" and aluminium as "longest-lived of the five"
while holding six materials. Both are now count-free, for the same reason the
"four surfaces" copy was.

### The error sink was the one untested route — 2026-08-26

`/api/report` is how the studio learns that a visitor's AR panel or configurator
threw, and nothing asserted anything about it. Seven checks now do, and the first
run found a defect: `typeof [] === "object"`, so a JSON array passed the body
guard, every field read as `undefined`, and the endpoint wrote a log line saying
nothing had gone wrong nowhere. An empty object did the same. Both are refused
now, while a boundary name on its own is still accepted — knowing which panel
threw is actionable even with no message. Removing either guard puts both bodies
back to 204, which is how they were confirmed to be load-bearing.

Writing those checks also produced a lesson about the checks themselves. The
first version shared one address across every assertion, and the limiter allows
five requests per address — so adding two checks made a sixth fail as
rate-limited: a real result for the wrong question. Each functional assertion now
uses its own address from the reserved documentation range, with one address held
constant for the flood test that actually wants to exhaust a bucket.

Separately, `reportError` was sending the full `window.location.search`, which
quietly broke the module's own promise to collect no form contents: a
configurator link carries the visitor's own wording in `?text=`. It now sends the
path plus the parameter *names* — which is what a diagnosis needs — and none of
the values.

### The configurator brief was quietly making things up — 2026-08-26

`describeConfig` turns a configurator link into the sentence the visitor sees
prefilled in their message and the studio quotes from. Three defects, none of
which anything asserted:

- **"ink ink".** The default ink is named "Ink", and the wording was
  `${name} ink` — so the single most common brief on the site read "Set in
  monumental lettering, ink ink, ivory ground."
- **Invented settings.** `getTypeface`, `getInk`, `getGround` and `getMount` all
  fall back to their first entry for an unknown id, which is right for rendering
  a preview and wrong for writing down what somebody asked for. A stale or
  hand-edited link produced a brief asserting choices nobody made. Unrecognised
  ids are now dropped.
- **An uncapped `text`.** The link builder capped wording at 200 characters; the
  reader accepted whatever arrived. A forwarded URL with 5000 characters prefilled
  all 5000 into the message field — past the 4000 the schema allows — leaving a
  form that could not be submitted until the visitor deleted a thousand characters
  by hand. The sibling `plan` parameter had been capped at 600 all along, which is
  what made the omission visible. The limit now lives in
  `src/lib/inquiry/config-link.ts`, imported by both ends: it cannot sit beside
  the reader, because the reader imports the `server-only` content layer and the
  writer is a client component — the build rejects that outright, which is how the
  first attempt at sharing it failed.

Six checks cover it now, and reinstating all three defects fails three of them.

### The paper-rectangle bug, sixth and last instance — 2026-08-26

The artwork page's own hero image — the largest, most-looked-at image on the
site — had `box-shadow` written directly onto the `<img>`. It is a transparent
PNG of cut letters sitting on a painted wall, so the shadow traced the image's
rectangle and put a faint paper edge around the product.

It survived four earlier rounds of fixing exactly this defect elsewhere because
the audit check only ever inspected an image's **wrapper**. A shadow on the
element itself was invisible to it. The check now looks at both, and on the image
itself there is no defensible reading — the element's box is precisely the
rectangle the shadow would trace, and the alpha is the whole point of the
artwork. Reinstating the bug produces 16 errors across the desktop matrix, which
is how that was confirmed rather than assumed.

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

**Blank sheets are skipped.** These are cut letters on a transparent ground, so a
piece with a short word leaves large empty margins and the tiler was sending them
through the printer: measured across every piece and size, 31% of sheets carried
no ink at all, worst case Name in Gold at Large with 29 blank sheets out of 35.
`src/content/ink-bounds.json` records each piece's ink rectangle — measured at
generation time, when the pixels are already in hand, because reading a
1500 × 2000 alpha channel is not something to do while rendering a page. Sheets
outside it are dropped, the remainder are numbered by printed position so the
labels stay contiguous, and the first sheet says how many were omitted. Alpha
above 8 rather than above 0: the generators antialias, and one pixel at 1/255
would stretch the box to the full canvas and make the measurement useless.

### Four pieces of one piece, and prose the gate could not read — 2026-08-27

Every gate was green, so the pages were looked at instead. The portfolio grid gave
up two things no check could have found.

**The four values boards were four versions of one piece.** They shared a single
six-word list — Curious, Honest, Together, Precise, Bold, Useful — and the
randomiser varies only which word is the hero and where each row aligns. So no two
files were byte-identical, the duplicate-image check stayed quiet, and the grid
showed the same six words four times over. That reads as filler, not as a
catalogue of four pieces. Each board now shows the words its own description
promises: house rules, reception values, a team charter, a process. The dispatch
throws on a piece with no set, for the same reason the collection dispatch does — a
default here is how four pieces became one.

**The count gate read the alt text and not the description.** It was built after
House Rules' alt said five words over a picture of six. It fixed the alt. The
description went on saying "Five words" over the same picture of six for two more
phases, because nothing ever read that field — the fix had been scoped to the
field the bug was found in rather than to the claim. Both fields make the same
claim about the same image, so both are checked now, and two more instances fell
out immediately: Bright Ideas' description said six bulbs where the generator
draws four (the noun list had `lightbulbs` but not `bulbs`, so the real sentence
was invisible to it), and `words-at-work` was never checked at all although
`statementLines` lays out every word of the title and drops nothing, which makes
the title the count.

The first run of the widened gate failed two *correct* sentences: "each carrying
one word" and "One word raised deeper than the rest". Both are distributive — one
of many, not a total of one — so only plurals are counted now. A genuinely
single-word piece goes unchecked, which is the same stance `drawnItemCount` takes
on a word cloud: better silent than inventing a rule.

**The landscape values board carried half the ink of the portraits.** `valuesBoard`
divides 82% of the height among its rows and the size clamp that binds is always
the row height, never the width target — so the same six words in a 4:3 box came
out at half the size they take in a 3:4 one. Measured rather than eyeballed: 12.6%
of the canvas inked against 23-25% for the three portraits, on the one piece whose
description promises it "reads from the far end of the table". A wide box splits
into two columns, which halves the rows and so doubles the row height. Every
measurement is a share of its own column, so the three portraits re-generated
byte-identical — one image re-hashed, which is the proof the change was scoped.

Filled across and then down, not down and then across: these lists are given in an
order that means something, and column-major put Ask, Draft, Test down one side
and Refine, Ship, Learn down the other — the right order only if the reader knows
to take the columns in turn.

`check:ar` earned its keep here without being touched: four artwork hashes changed
and it failed all four by name.

**The words inside the bulb rings were sitting across them.** `lineArtBulbs`
fitted each word to 85% of the ring's *outer* diameter, so the stroke's own
half-width was already eating the margin — and then the word grew again by its
bevel and its contact shadow, neither of which the arithmetic knew about. A
circle also narrows away from its centre line, so the width available to a word
depends on how tall the word is. Words are fitted to the chord at their own cap
height inside a clear radius that subtracts the stroke, the bevel and the shadow,
refined twice; and the word's shadow is drawn shorter than the ring's, which is
both true of a shallower letter and worth a quarter of the budget back.

Measured, not eyeballed, because eyeballing it failed twice — once seeing a
collision that was 13px of clearance, once missing one that was 13px of overlap.
Rasterising the text layers alone and measuring the furthest ink from each ring's
centre: before, TARGETS reached 10.9px and GROWTH 13.1px past the inner edge;
after, every word is inside with 7.7px to spare. The same expression is now an
assertion in the generator, which reproduces the measured distance exactly, so
the check costs no rasterising.

A full stroke of clearance was considered and rejected: it costs 13-17% of type
size on the six-bulb panoramas, where the words are already smallest, and in that
case the cap rather than the width binds — so the extra margin buys no room, only
smaller letters.

**Two faults in the interaction harness, found by pointing it at a dead port.**
The eleven standalone contexts were awaited bare while the viewport groups were
each wrapped, so the first crash took the other ten with it: the run ended in a
stack trace with no summary, which makes a server that died halfway
indistinguishable from a suite that found nothing. And with nothing loaded, "no
console errors during interaction" passed in all three viewports — a page that
never loaded logs nothing, and that is a number quoted as evidence in every
report. It counts documents that actually arrived now.

The first version of that guard counted `load` events and still passed, because
Chromium fires `load` for its own connection-refused error page: the guard agreed
with the bug it was written to catch. Successful document responses are the
signal. Against a dead port the suite now scores 0/50 rather than 3/50, and
against the real build 363/363.

That prompted a sweep of the other gates for the same shape, since every one of
them delivers its verdict as the absence of a finding — which makes a run that
measured nothing read exactly like a run that found nothing wrong. The responsive
audit crashes rather than passing when the server is dead, and its "620 checks" is
a measured counter rather than the product of the two lists, so it was honest; it
now also refuses to pass unless that count equals the product, so a skipped page
cannot hide inside a green result. The image-sizing check recognises optimised
images by their `/_next/image` URL, which a config change or a different loader
would quietly stop producing, so it refuses to pass on zero.

**A stale fact in the plan's own ingestion instructions.** Two paragraphs said
artworks are served from `<slug>.<hash>.jpg` and told anyone bringing in real work
to drop a `.jpg` — while `readMaster` looks for `.png` and nothing else, because
these pieces carry alpha. Following the instruction would have done nothing at
all, silently, and the site would have gone on serving placeholders.

`check:slug-refs` now reads the file paths in the docs too, by format rather than
by existence: `public/artworks/<slug>.png` is deliberately a file that does not
exist yet, since it is the file the reader is being told to create, but its
extension has to be one its own directory actually holds. Every directory here
carries one or two formats for a stated reason — PNG for alpha, GLB and USDZ
because those are what the two platforms accept — so a path naming anything else
names something the pipeline cannot read. Putting the old extension back fails it
by name.

### The stale-build guard had never once checked a build — 2026-08-27

Every gate here reports its verdict as the absence of a finding, so a gate
pointed at the wrong server gives a confident answer about something else. Both
halves of that happened within an hour, and hunting the second one found that the
defence against it had never worked.

**A gate passing on yesterday's bundle.** `check:analytics` defaults to port
4020, which is `serve.mjs`'s port, and that port was held by a server started the
previous day. It reported PASS three times — about a build nobody was looking at.
The property it checks, that no third-party script loads without a measurement
id, belongs to the bundle being served, so a green result there was worth less
than a red one.

**A gate reporting a site catastrophe that was an unread argument.** The
responsive audit takes its base URL as `--url`; every other script here takes it
positionally. Handed it positionally, it discarded the value, measured the
default port — a month-old node process answering 404 to everything — and
reported 589 unexpected-status errors and 620 pages with no `h1`. It now refuses
an argument it does not understand, and refuses a server that is not serving this
site.

**And then the guard itself.** Writing a shared version of the assertion meant
negative-testing it, which it failed: told the disk build had changed, it printed
`Serving build aDifferentBuildIdEntirely` and carried on. `servedBuildId` read
the served id by matching `/_next/static/<id>/_buildManifest` — a pattern this
version of Next never emits, since the only segments under `/_next/static/` are
`media` and `chunks`. So it returned null on every call in its existence, every
comparison against it was dead code, and `startProductionServer` announced

    → Verified server is serving build XKh5FOqqpwJd9FD8S0yG-

using the id from disk, having verified nothing. The one helper whose whole
purpose is to refuse a stale build had never detected one — which is also why the
analytics failure above went unnoticed for a day.

The id *is* in the served HTML, so the test is now whether it is there: a
question that cannot come back vacuously true. Seven gates share one
`assertServing` — three had near-identical copies of the check and three had none
at all, including the interaction suite's 363 checks and the hero-wall gate whose
default port was the one holding the stale server. Four branches were tested
separately: a dead port, a stale build where the build is required, a stale build
where it is only reported (the audit and Lighthouse legitimately run against a
dev server or a deployment), and `startProductionServer`'s own refusal.

**One unnameable flake, made nameable.** One interaction run in four came back
362/363 and the failing check could not be identified, because the run had been
filtered through `grep` for its summary line. Three clean runs afterwards
established only that it was intermittent. The suite writes every result to
`.interaction-report.json` now; a check that fails once and cannot be named is a
check that cannot be fixed.

Two navigation timeouts inside `verify` remain unexplained and are recorded as
such above: the cause was hunted, the leading theory was tested and disproved,
and what changed is that the symptom is no longer destructive.

**And the image-sizing check was reading the wrong string.** It took
`img.currentSrc || img.src`, and on a `next/image` element `img.src` is the
no-srcset fallback — the *largest* rung of the ladder. Chromium supports srcset,
so that URL is never the resource fetched. An image that had simply not chosen a
candidate yet was therefore reported as having fetched 3840px, which made a
77 × 103 thumbnail "365x the pixels" and failed the gate. Not a race being
mis-measured: the wrong string.

It reads `currentSrc` alone now. An image that is laid out and has not chosen is
counted as pending, given another moment, and reported if it still has not —
because a silent skip is how a gate loses coverage while looking clean. Coverage
went from 276 measured to 284-286.

**A loose accent mark, on the pieces where the word is the product.** Every
`raisedScript` piece carried a gold dot above the word, positioned at a fixed
fraction of the word's half-width and of the type size. That is blind to the
letterforms — this generator knows character advances, not glyph outlines, so it
cannot tell where an ascender is — and on two of the four pieces the dot landed
on one: the "a" of Bismillah and an "l" of Alhamdulillah. On the other two it
floated free. On a studio selling cut lettering, a loose gold mark touching a
letter reads as an offcut left on the wall.

Removed rather than repositioned, because nothing was lost: the accent colour is
carried by the underswept flourish, which has a documented reason to exist, and
the dot never had one. `screenshots.mjs` also gained the materials page, the
your-words filter and the print template — all three were audited for layout but
absent from the list a person actually looks at, and both of the day's content
defects were found by looking.

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
