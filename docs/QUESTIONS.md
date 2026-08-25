# Queued questions

Decisions needing the project owner. Raised while working autonomously —
nothing here blocked progress, because a sensible default was chosen and is
noted for each. Reviewing these is the fastest way to move the build toward
launch.

## Open

### 1. Real business details
`src/config/site.config.ts` still has TODO markers on the canonical domain,
legal name, street address, geo coordinates, phone, WhatsApp number, inquiry
email, social URLs and founding year.

**In use:** `7th-sky-walls.vercel.app`, `hello@example.com`,
`+92 300 0000000`, a Karachi placeholder address.
**Why it matters:** these appear in canonical URLs, JSON-LD and the sitemap, so
a placeholder domain tells search engines the wrong address for every page.

### 2. GitHub remote
Deferred by you. Local branches `main`, `phase-1-foundation` and
`phase-2-portfolio` hold all work; nothing has been pushed. Needs a repo URL,
or `gh` CLI installed and authenticated.

### 3. Email delivery credentials
Without `RESEND_API_KEY` and `INQUIRY_FROM_EMAIL`, a submitted inquiry is
written to the server log and the form still reports success.
`assertDeliveryConfigured()` exists so a health check can fail loudly instead.
The sending domain also needs verifying with Resend.

### 4. Calligraphy typefaces, including Urdu
The text configurator offers three Latin faces. If calligraphy pieces should
accept Urdu or Arabic wording, that needs a Nastaliq face (Noto Nastaliq Urdu
is the obvious candidate) and right-to-left handling in the preview.

**In use:** Latin only — Fraunces, Cormorant Garamond, Manrope.

### 5. Frame finishes
Four are offered: floating hardwood, slim aluminium, gallery wrap, matte
black. Are these the finishes actually produced, and are the descriptions
accurate?

**Related limit:** AR models carry each artwork's default finish only.
Generating one per finish would quadruple the asset matrix. If seeing a
specific frame in AR matters, say so and it can be scoped.

### 6. Standard size chart
Four tiers derived from a long edge: 60, 80, 120, 160 cm (panoramic pieces use
120, 150, 200, 250). Every size of a piece shares one aspect ratio, so nothing
is cropped to fit — but that also means these are the only sizes without
moving to made-to-measure.

### 7. Materials and lead times
`materials.json` states 370 gsm canvas, 310 gsm cotton rag, 3 mm aluminium
composite and Class B fire-rated wall covering. The services carry typical
timings — concepts in five working days, installs in three to six weeks. Both
are stated publicly and should match what the studio can actually deliver.

### 8. Case studies
Three placeholder projects are on the About and space pages, each visibly
marked as illustrative. They should be replaced with real work, or removed.

### 9. Error reporting service
The error boundaries log the failure and its digest, which is what correlates a
browser report to the server log — but nothing collects those logs, so a
failure a visitor hits is invisible unless they mention it. Vercel shows
server-side runtime logs already; client-side errors need a service. Sentry is
the usual choice and has a free tier that would comfortably cover this site's
traffic. It is a paid dependency and an external processor of visitor data, so
it is the studio's call rather than mine. Wiring one in is a small change
either way — the boundaries are already the place it hooks into.

## Resolved

- **Tier 2 AR (custom WebXR session).** Research established that
  model-viewer's own WebXR path already does wall placement at fixed scale on
  Android Chrome and Samsung Internet — which is what tier 2 existed to
  provide. A custom session would add only in-AR size switching. Reclassified
  as a post-device-testing enhancement rather than a gap.
- **GSAP.** Planned for scroll work, never needed. Reveals are CSS with an
  IntersectionObserver trigger, parallax is a small imperative hook, and the
  progress bar is a CSS scroll-driven animation. The animation library was
  removed entirely, which measurably improved mobile performance.
- **A modern `browserslist` to shed legacy JavaScript.** Lighthouse flags the
  framework chunk under "legacy JavaScript" and "avoid serving legacy
  JavaScript to modern browsers", which suggests declaring modern targets would
  shrink it. Tried it — Chrome/Edge/Firefox 100+, Safari and iOS Safari 15.4+,
  Samsung Internet 19+ — and the production chunks went from 2073 KB to 2092
  KB. Next.js 16 already compiles for modern targets, so the declaration bought
  nothing and would only have narrowed the browsers the project claims to
  support. Reverted. The flagged bytes are the React and Next runtime, which is
  the floor for an App Router site; the audit also confirmed no AR, planner or
  camera code reaches a page that does not use it.
