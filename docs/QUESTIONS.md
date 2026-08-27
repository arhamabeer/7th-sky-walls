# Queued questions

Decisions needing the project owner. Raised while working autonomously — nothing
here blocked progress, because a sensible default was chosen and is noted for
each.

## Waiting on you

Scan this list; everything below it is already settled and kept for the record.

Nothing here is a decision any more — every open item is a piece of material or a
device. The decisions were answered on 2026-08-27 and are recorded below.

| # | Still owed | What it holds up |
| --- | --- | --- |
| [7a](#7a-materials-and-lead-times--researched-fire-behaviour-added) | The thicknesses actually stocked | Nothing on the site is wrong until a stocked gauge differs — the specs say "typically 10 mm", not 10 mm — but a facilities manager will quote them back. The lead times are answered and stand. |
| [1](#1-real-business-details--the-studio-will-edit-them-directly) | The real business details | Every `TODO` in `src/config/site.config.ts` — domain, legal name, address, coordinates, phone, WhatsApp, inquiry email, socials, founding year. These reach canonical URLs, structured data and the sitemap. The placeholders stay visible meanwhile, by your decision. |
| [3](#3-email-delivery--direct-channels-now-resend-before-production) | `RESEND_API_KEY` | Until it is set the form refuses to claim success and hands the visitor a prefilled WhatsApp or email message instead. That is honest, not delivery. |
| [8](#8-case-studies--keep-the-placeholders-keep-the-label) | Real project stories and photography | The three placeholders stay with their "illustrative example" label, by your decision. The label comes off by a flag when the real ones land. |
| — | An iPhone | The only thing [the AR checklist](AR-DEVICE-QA.md) cannot be run without, and the one deciding whether the iOS half of Phase 10 goes ahead. |

**Answered 2026-08-27**, all four asked and answered together:

- **Printed wall coverings are not a service.** The claim stays removed; no
  `materials.json` entry and no Services section are owed. See [7b](#7b-are-printed-wall-coverings-still-a-service--answered-no-dropped).
- **The lead times stand as written** — five working days to concept, three to six
  weeks to install, framed on the page as typical rather than promised.
- **The configuration placeholders stay visible.** "Street address pending" and a
  placeholder number are honest and are not invented data; hiding the contact
  block on a site whose only goal is an inquiry would be the worse trade.
- **The case-study placeholders stay, with their label.**

Nothing in that list blocks anything else; each has a working default in place
and the code says which.

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

### 7a. Materials and lead times — researched, fire behaviour added
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

**Narrowed 2026-08-26.** The studio asked for these to be researched properly
rather than left, so they were — and the research changed the recommendations,
not just the numbers.

Two pages tell the reader that fire rating is the first thing a facilities
manager asks, and nothing answered it. Every material now carries its fire
behaviour, and the answers are not what the old list implied:

| Material | In fire |
| --- | --- |
| Expanded PVC | Self-extinguishing. Chlorine is over half its mass; limiting oxygen index 35–45%; thin gauges reach Class A under ASTM E84 |
| Aluminium | Non-combustible |
| MDF | Class D as standard; fire-retardant MDF reaches Class B |
| Acrylic, including mirror | Combustible. Standard cast acrylic is not fire resistant |
| PLA | Combustible, no useful rating |

That reversed a recommendation. Acrylic was being offered for schools and
corridors, and it is the worst fire performer of the five — so PVC foam is now
the default there, and aluminium is what answers a specification with no room in
it. Getting this backwards on a site aimed at schools and hotels would have been
found by a procurement officer rather than by us.

**Each claim is a property of the material, never a certified result for this
studio's letters.** "Expanded PVC is self-extinguishing" is a fact about PVC;
"our letters are Class B certified" would need a test certificate. The copy says
supplier test data is available on request, which is true and is the studio's to
send.

Thicknesses are now written as "typically 10 mm", "typically 19 mm" rather than
as commitments.

**The lead times are answered.** 2026-08-27: five working days to concept and
three to six weeks to install stand as written. The page frames them as "typical
timing" rather than as commitments, which is the honest framing for a range, and
they are unchanged pending anything the studio wants to correct later.

**Still needed, and it is narrower again:** the thicknesses actually stocked. The
specs read "typically 10 mm", "typically 19 mm" rather than as commitments, so
nothing on the site is wrong until a stocked gauge differs — but a facilities
manager will quote these back. Everything else stands on material science rather
than on an assumption about this studio.

### 7b. Are printed wall coverings still a service? — **answered: no, dropped**
Opened 2026-08-26 while sweeping the last of the print-era copy.

Three places still described the previous product line, and one of them made a
claim a procurement officer would rely on. The services page offered "printed
wall coverings" and "archival large-format production" with a "choice of canvas,
acrylic, aluminum or fine-art paper", and the school page said "our wall
coverings are Class B fire-rated" — for a product with no entry in
`materials.json` at all, and a rating that contradicts what the materials page
now says. The office and café pages compared their materials against canvas.

All of it is rewritten against the researched material facts, and the fire
sentence on the school page now says what `materials.json` says: PVC foam is
self-extinguishing and thin gauges reach Class A under ASTM E84.

**The question that is left:** printed wall coverings and murals were listed as
one service. Murals are kept — they appear in the site's own strapline and need
no sheet material. The wall-covering claim is removed rather than corrected,
because correcting it would mean inventing a spec and a fire rating.

**Answered 2026-08-27: not a service.** The claim stays removed and nothing
further is owed — no `materials.json` entry, no Services section. Asking rather
than deleting a possible revenue line quietly was the point of writing it down.

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
