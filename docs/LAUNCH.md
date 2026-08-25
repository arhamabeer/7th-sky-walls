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
npm run verify
npm run test:interaction
npm run lighthouse
```

| Command | What it proves |
| --- | --- |
| `check:images` | Every artwork file on disk matches the dimensions the site declares. A mismatch causes layout shift and letterboxed renders. |
| `check:ar` | All 96 AR asset pairs encode the exact finished size advertised, carry the Quick Look rotation and vertical anchoring, and are packed the way Quick Look requires. |
| `verify` | Production build, hero wall arrangement, and the responsive audit across 31 viewports — desktop, laptop, tablet and phone, portrait and landscape. |
| `test:interaction` | 183 behavioural checks across mobile, tablet, desktop, reduced-motion and rate-limit contexts. |
| `lighthouse` | SEO, best practices and accessibility at 90+ on seven routes. All three currently sit at 100. |

`npm run test:interaction` and `npm run lighthouse` need a server already
running (`npx next start -p 4020`); `npm run verify` starts its own.

## Content and configuration

- [ ] **Replace every TODO in `src/config/site.config.ts`.** Canonical domain,
      legal name, address, geo coordinates, phone, WhatsApp number, inquiry
      email, social URLs, founding year. These appear in canonical URLs,
      structured data and the sitemap, so a placeholder domain here means every
      page tells search engines the wrong address.
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
- [ ] **Check the materials list** in `materials.json` against what the studio
      actually prints on. The fire rating and GSM figures are the ones a
      facilities manager will quote back.

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
- [ ] Watch the AR events (`ar_launch_attempt`, `ar_status`,
      `ar_launch_unavailable`). The platform viewers break independently of
      this codebase — Scene Viewer was broken for four months in 2025 — and
      these events are the only warning.
