# AR device testing checklist

Everything in the AR pipeline that can be verified without a phone already is:
`npm run check:ar` asserts that every model encodes the exact finished
dimensions the site advertises, that the Quick Look rotation is baked in, that
vertical plane anchoring and metric units are declared, and that the archives
are shaped the way Quick Look requires. `npm run test:interaction` asserts that
the right assets are wired to the viewer and that the AR affordance never
dead-ends.

What no amount of automation can confirm is what actually happens when a phone
points at a wall. This checklist covers exactly that, and it needs one iPhone
and one Android handset.

## Before starting

- Deploy to a preview URL. **AR will not work over plain `http://` or from
  another machine's `localhost`** — the camera and both handoff viewers require
  a secure context.
- Use **Sabr** or **Begin Anyway** for the first run. Both have a clear top and
  bottom, which matters: an upside-down or wall-facing model is
  indistinguishable from a correct one on a symmetric piece. Sabr's brass
  flourish sits *beneath* the word, so a flipped model is obvious without
  reading anything — which is the point on a phone held at arm's length.
  (This said "Minaret Dawn" until 2026-08-26, a piece from the catalogue that
  the product-category rebuild replaced. A checklist whose first instruction
  names something that does not exist is a checklist nobody finishes.)
- Have a tape measure to hand.

## iPhone — Safari

1. Open an artwork page, choose **Large**, open the **On your wall** tab.
2. The 3D view should show the piece as cut letters with the wall visible
   between them — no panel, no rectangle. That is the GLB, and it is what
   Android AR uses too.

   **The one thing this test exists for.** iOS is the exception. Quick Look takes
   the USDZ, which still carries a box and the opaque artwork-on-wall-tone
   texture, because nobody has confirmed how Quick Look handles cutout alpha. So
   in the 3D view and on Android you will see **cut letters**, and when AR opens
   on the iPhone you will see a **panel**.

   What to report back: whether that panel reads as acceptable on the wall or as
   obviously wrong. That answer decides whether the USDZ gets the same alpha
   treatment as the GLB — and if it does, this is the device that has to confirm
   it works, rather than an invisible piece shipping to every iPhone.
3. Tap **Place on my wall**. AR Quick Look should open over Safari.
4. **Orientation.** Point at a wall. The artwork must stand upright, facing
   into the room.
   - Facing *into* the wall means the baked X rotation has the wrong sign.
   - Lying flat on the floor means the vertical anchoring token is not being
     read.
   - Upside down means the rotation axis assumption is wrong.
5. **Flush mounting.** The back of the frame should sit against the wall, not
   float in front of it or sink into it.
6. **True scale.** Measure the placed artwork. At Large it must be 90 × 120 cm
   for a portrait piece — Sabr and Idea are both portrait. Anything else means the authored dimensions or
   `metersPerUnit` are wrong.
7. **Scale lock.** Try to pinch-resize. It must not resize —
   `#allowsContentScaling=0` is appended by model-viewer for
   `ar-scale="fixed"`.
8. Repeat at **Small** and **Extra large** to confirm each size loads its own
   model rather than a rescaled one.
9. Test a **panoramic** piece (Ask Better Questions) — the widest models are
   where an aspect or rotation error is most obvious.
10. Test a **word cloud** (Idea) at Extra large. A cloud is the case where a
    wrong aspect or a crop is unmistakable, because words run off the edge.

## Android — Chrome

1. Same starting steps.
2. Chrome should use **WebXR** and stay in the page. Confirm the AR session
   opens inline rather than handing off.
3. **Wall detection.** Blank, evenly-lit walls are the hard case for ARCore.
   Test one deliberately: sweep the phone slowly and confirm the coaching text
   on the panel is accurate about what to do.
4. Repeat steps 4–8 from the iPhone list.
5. Test a device **without** Google Play Services for AR if one is available.
   The panel must either prompt to install it or explain the limitation — it
   must never present a button that does nothing.

## Configured wording — Android and desktop only

A piece set with the customer's own words is built into a GLB in the browser, so
the 3D view and the WebXR path show it. Quick Look does not: it takes a USDZ,
which is pre-built, and the panel says so.

1. Open a customisable piece — Sabr or Name in Gold — and go to **Make it
   yours**.
2. Type something, then switch to **On your wall**. The 3D view must show your
   words, not the original piece.
3. **Urdu.** Choose the Urdu voice and type Urdu. The letters must join and read
   right to left. Isolated, unconnected letterforms mean the Nastaliq face did
   not load and something fell back — that is the failure to look for, and it is
   obvious once seen.
4. **Arabic.** Choose the Arabic voice. It must be Naskh, not Nastaliq. If
   Arabic renders in the Nastaliq hand the two faces have been crossed.
5. Launch AR on Android and measure the placed piece. Configured or not, at
   Large a portrait piece is 90 × 120 cm — the wording changes the texture, never
   the size.
6. On an iPhone, confirm the handoff opens the **original** piece and that the
   panel said it would. A silent substitution is the bug; a stated one is the
   design.

## Both platforms

- **Backgrounding.** Leave AR, switch apps, return. The page should still be
  usable and the AR button should still work.
- **Repeat launches.** Launch AR, return, change size, launch again. The second
  launch must show the new size.
- **Analytics.** Confirm `ar_launch_attempt`, `ar_status` and, where relevant,
  `ar_launch_unavailable` events reach the analytics property. These are the
  only signal that a platform viewer has broken — Scene Viewer was broken
  platform-wide for four months in 2025 with no change on any site's side.

## If orientation is wrong on iOS

The fallback is already researched: export with `includeAnchoringProperties`
omitted and no baked rotation. Quick Look then snaps the model to either floor
or wall without auto-rotating it. This loses wall-specific onboarding, so it is
the second choice, not the first — but it is a known-good escape hatch.

Change `alignment` and the baked rotation together in
`scripts/ar/build-usdz.mjs`; `npm run check:ar` will fail loudly if only one of
them changes, which is deliberate.

## Recording results

Note the device, OS version, browser version and outcome for each step. The
platform viewers change independently of this codebase, so a dated record of
what worked is the only way to tell a regression from a bug.
