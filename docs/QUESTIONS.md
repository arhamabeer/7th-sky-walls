# Queued questions

Decisions needing the project owner. Raised while working autonomously —
nothing here blocked progress, because a sensible default was chosen and is
noted for each.

All nine queued questions were answered on 2026-08-25. What is left is not a
decision but material: the repo URL, the real business details, and the email
credentials, each noted below with who does what.

## Answered — scope

### 11. Which product line is this site for? — **commercial only**
Two references have arrived and they point at different markets.

The photographs sent first are **commercial dimensional lettering**: an IDEA
lightbulb built from cut words, THINK OUTSIDE THE BOX with a noughts-and-crosses
grid, outline bulbs on wires. Office walls, single statement pieces, matte
finishes. That is what the catalogue was rebuilt around, and it matches the
brief's B2B targets — offices, cafés, hotels, restaurants, schools, universities.

The pyariwalls collection linked afterwards is **residential decorative mirror
acrylic**: hexagon and butterfly mirror sets of six to twenty-two pieces, leaf
and sunflower mirrors, gold Islamic name plaques. Homes, modular sets,
reflective finishes.

What was taken from it, because it applies to both: mirror acrylic was missing
from the materials list entirely despite being the finish this market asks for
by name, and every piece in the catalogue was a single panel when sets are how
this market buys. A Mirror Acrylic collection now covers geometric sets and a
gold mirror name piece, all of which suit a reception, restaurant or hotel wall.

What was **not** taken: butterflies, florals and sunflower mirrors. They are
residential decor, and putting them beside a B2B services page that talks about
fire ratings and facilities managers would make the site read as unsure what it
sells.

**Answered 2026-08-25: commercial only. Residential decor is out of scope for
now.**

So the catalogue stays as it is — the mirror range was kept because a hexagon
set or a gold name reads correctly on a reception, restaurant or hotel wall, and
the butterflies, florals and sunflower mirrors were never brought in. One piece
of copy was corrected: the gold mirror name piece offered "a family name", which
is a residential framing; it now offers a company or restaurant name, or Arabic
wording in Naskh.

If residential is ever added it should be separated rather than mixed — the
buyers, the sizes and the language are all different, and a services page
discussing fire ratings beside butterfly mirrors reads as a studio unsure what
it sells.

## Re-opened

### 7a. Materials and lead times — answered, but for the wrong product
Confirmed on 2026-08-25 as 370 gsm canvas, 310 gsm cotton rag, 3 mm aluminium
composite and Class B fire-rated wall covering. Those describe **printing**, and
the reference photographs that arrived later the same day show the studio makes
**cut dimensional lettering**. So the confirmation stands for a catalogue that no
longer exists.

The replacement list is researched, not confirmed, and it is stated publicly
where a facilities manager will quote it back:

| Material | Spec as written |
| --- | --- |
| Laser-cut acrylic | 10 mm cast acrylic, flame-polished edge, matte or gloss face |
| PVC foam board | 19 mm expanded PVC, sprayed satin, sealed edge |
| CNC-routed MDF | 19 mm MDF, primed and sprayed, sealed faces |
| Brushed aluminium | 3 mm face on 15 mm returns, clear anodised |
| 3D-printed PLA | continuous-line print, 8 mm depth, colour through the material |

Mounting is offered as flush, 12 mm standoff, 25 mm standoff or on a backer
panel. Lead times were left as they were — concepts in five working days,
installs in three to six weeks — but they were confirmed against printing and
should be checked against fabrication.

**Needed:** confirm or correct each thickness, each finish, and whether these are
the five materials the studio actually works in. Everything else about the
rebuild is safe to leave; this is the part that makes a public claim.

## Answered — waiting on material from the studio

### 1. Real business details — the studio will edit them directly
`src/config/site.config.ts` keeps its TODO markers and its placeholder values
(`7th-sky-walls.vercel.app`, `hello@example.com`, `+92 300 0000000`, a Karachi
placeholder address) until the studio edits them.

That file is the only place any of it lives, verified rather than assumed: a
swap to a 44-character name and a different palette leaves no trace of the old
brand across fourteen routes including the sitemap, robots and manifest. See
`npm run check:brand`.

**One caution when editing it.** Do not use PowerShell's `Set-Content` or
`-replace` on this file. It rewrites em-dashes and accented characters as
mojibake, and a case-insensitive replace has already turned `legalName` into
`legalname` once. Any editor is fine; so is `git diff` afterwards.

### 2. GitHub remote — the studio will create a private repo and send the URL
Create it empty — no README and no `.gitignore`, or the first push conflicts.
Then the remote gets added and all four branches pushed.

`gh` CLI is not installed on this machine, so the push will use whatever git
credentials Windows has cached for `arhamabeer`. Whether those exist cannot be
known without trying; if the push fails on authentication it will be reported
rather than worked around.

### 3. Email delivery — direct channels now, Resend before production
Decision: WhatsApp and email links carry inquiries for now, and a Resend
account is set up before production.

**This leaves one failure mode that must not survive to launch.** Without
`RESEND_API_KEY` and `INQUIRY_FROM_EMAIL`, a submitted inquiry is written to the
server log and the form still tells the visitor it was sent. A form that
silently swallows an inquiry is worse than no form. So the form no longer
reports success when delivery is unconfigured in production — it says plainly
that the studio should be reached on WhatsApp or by email, and offers both.
Development still logs, because that is how the form is testable.

`assertDeliveryConfigured()` exists for a deploy-time health check.

## Answered — settled

### 4. Calligraphy typefaces, including Urdu — **yes, Urdu and Arabic both**
Two faces, both confirmed available through `next/font/google` with an `arabic`
subset:

| Script | Face | Why |
| --- | --- | --- |
| Urdu | Noto Nastaliq Urdu (400–700, variable) | Urdu is written in Nastaliq; anything else reads wrong to an Urdu reader |
| Arabic | Amiri (400/700, italic) or Noto Naskh Arabic | Quranic and classical Arabic wording belongs in Naskh, not Nastaliq |

Both stay `preload: false`, so nothing downloads until the configurator is
opened and that face chosen. Arabic subsets are large — a Nastaliq subset runs
to roughly 150–250 KB — which is exactly why it must not touch the initial load.

### 5. Frame finishes and AR — **default finish only, unchanged**
AR answers "how big will this be on my wall", and size is what it is built to
carry. Frame colour is decided on screen, where the colour is accurate; under
AR lighting it would not be. The asset matrix stays at 96 pairs / 5.7 MB rather
than 384 pairs / ~23 MB.

### 6. Standard size chart — **confirmed as is**
60, 80, 120, 160 cm on the long edge; panoramic pieces 120, 150, 200, 250. Every
size of a piece shares one aspect ratio, so nothing is cropped to fit. Made to
measure stays available through the inquiry, which every artwork page already
says.

### 7. Materials and lead times — **superseded, see 7a**
Confirmed as 370 gsm canvas, 310 gsm cotton rag, 3 mm aluminium composite and
Class B fire-rated wall covering. Those describe printing, and the catalogue is
no longer printed work. Re-opened at the top of this file.

### 8. Case studies — **keep the placeholders, keep the label**
Three illustrative projects stay on the About and space pages, each carrying its
visible "illustrative example" note, until real project stories and photography
arrive. Setting `isPlaceholder: false` in `case-studies.json` removes the note.

The note stays until then. A placeholder that does not announce itself is a
false claim about work the studio has done.

### 9. Error reporting — **own endpoint, no third party**
Decision: client-side failures POST to an internal route rather than to Sentry
or any external service. No paid dependency, no external processor of visitor
data, nothing to add to a privacy policy, and the existing rate limiter guards
the endpoint.

Accepted trade-off: no grouping, no alerting, no email, and stack traces stay
minified. Reading them means looking at Vercel's runtime logs, whose retention
depends on the plan. The boundaries are the hook point either way, so moving to
a service later stays a small change.

### 10. Custom text in AR — **yes, in scope**
Raised as a follow-up once Urdu was confirmed, and confirmed: a customer should
be able to set their own wording and then see it on their own wall at true size.

Currently no configurator text reaches AR at all, in any script, because AR
assets are built ahead of time and a customer's words are not known then.

**The hard part is not the 3D, it is the text.** Nastaliq is among the most
demanding scripts to shape, and the obvious server-side renderers do not do it
properly — Satori, which Next.js uses for images, has no full shaper. Rendering
Nastaliq server-side would mean either headless Chromium in a function or
wiring HarfBuzz by hand.

The way around it is to let the browser shape the text, since it already does
this perfectly and has already loaded the font for the preview: draw the
composed texture to a canvas with `fillText`, which goes through the same text
stack, and build the GLB and USDZ from that. The USDZ packer is pure JavaScript
over fflate and can run client-side unchanged, rotation and alignment included.

**One thing must be verified before this is committed to:** whether iOS Quick
Look will open a `blob:` URL given as `ios-src`. If it will not, the generated
USDZ has to be POSTed to a small route that serves it back from a real URL with
`model/vnd.usdz+zip` — still far lighter than generating it server-side. This
verification comes first; the phase is not planned around an assumption.

## Resolved earlier

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
