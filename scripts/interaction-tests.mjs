/**
 * Interaction tests.
 *
 * The responsive audit checks layout; this checks behaviour — tab switching,
 * size selection, the fullscreen viewer, filtering, mobile navigation,
 * keyboard access and the reduced-motion path.
 *
 * Driving a real browser here rather than checking by hand matters because a
 * backgrounded browser tab throttles requestAnimationFrame, which makes
 * animation-dependent state look broken when it is not.
 *
 * Usage: node scripts/interaction-tests.mjs [baseUrl]
 */
import { chromium } from "playwright";

const BASE = (process.argv[2] || "http://localhost:4010").replace(/\/$/, "");

const VIEWPORTS = [
  { name: "mobile", width: 393, height: 852, touch: true },
  { name: "tablet", width: 834, height: 1194, touch: true },
  { name: "desktop", width: 1440, height: 900, touch: false },
];

const results = [];
const record = (viewport, name, pass, detail = "") =>
  results.push({ viewport, name, pass, detail });

/** Ratio helper tolerant of sub-pixel rounding. */
const ratio = (w, h) => Math.round((w / h) * 100) / 100;
const near = (a, b, tol = 0.06) => Math.abs(a - b) <= tol;

async function testArtworkPage(page, vp) {
  // A panoramic piece exercises the aspect handling most strictly.
  await page.goto(`${BASE}/portfolio/glass-horizon`, { waitUntil: "networkidle" });
  await page.addStyleTag({
    content: "*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important}",
  });

  // --- Main image keeps the artwork's true proportions.
  const main = await page.evaluate(() => {
    const img = document.querySelector("main img");
    const r = img.getBoundingClientRect();
    return { w: r.width, h: r.height, natW: img.naturalWidth, natH: img.naturalHeight };
  });
  record(
    vp.name,
    "artwork image keeps 5:2 panoramic ratio",
    near(ratio(main.w, main.h), 2.5) && near(ratio(main.natW, main.natH), 2.5),
    `box ${ratio(main.w, main.h)}, source ${ratio(main.natW, main.natH)}`,
  );

  // --- Size selection updates the stated dimensions and the URL.
  const smallBtn = page.locator("main button", { hasText: /^Small/ }).first();
  await smallBtn.click();
  await page.waitForTimeout(120);
  const afterSmall = await page.evaluate(() => ({
    live: document.querySelector("[aria-live=polite]")?.textContent ?? "",
    url: location.search,
    pressed: [...document.querySelectorAll("main button[aria-pressed=true]")].map((b) =>
      b.textContent.trim().slice(0, 20),
    ),
  }));
  record(
    vp.name,
    "size selection updates stated dimensions",
    afterSmall.live.includes("120") && afterSmall.live.includes("48"),
    afterSmall.live.trim().slice(0, 60),
  );
  record(
    vp.name,
    "size selection is mirrored in the URL",
    afterSmall.url.includes("size=s"),
    afterSmall.url || "(empty)",
  );
  record(
    vp.name,
    "exactly one size is marked pressed",
    afterSmall.pressed.length === 1,
    afterSmall.pressed.join(", "),
  );

  // --- A shared URL restores that size.
  await page.goto(`${BASE}/portfolio/glass-horizon?size=xl`, { waitUntil: "networkidle" });
  await page.waitForTimeout(250);
  const restored = await page.evaluate(
    () => document.querySelector("[aria-live=polite]")?.textContent ?? "",
  );
  record(
    vp.name,
    "size is restored from a shared URL",
    restored.includes("250") && restored.includes("100"),
    restored.trim().slice(0, 60),
  );

  // --- Scale view swaps in the room preview.
  await page.locator("[role=tab]", { hasText: /scale/i }).click();
  await page.waitForTimeout(200);
  const room = await page.evaluate(() => {
    const fig = document.querySelector("main figure");
    if (!fig) return null;
    const label = fig.querySelector("[role=img]")?.getAttribute("aria-label") ?? "";
    const caption = fig.querySelector("figcaption")?.textContent ?? "";
    return { label, caption };
  });
  // The label must name both scale anchors: the person and the scene's
  // furniture reference, so the preview is described, not just decorative.
  record(
    vp.name,
    "scale view renders the room preview with reference objects",
    Boolean(room && /170 centimetre tall person/.test(room.label) && /beside a[n]? \d+ cm/.test(room.label)),
    room ? room.label.slice(-90) : "figure missing",
  );
  record(
    vp.name,
    "room preview caption states real dimensions",
    Boolean(room && /250/.test(room.caption)),
    room ? room.caption.trim().slice(0, 60) : "",
  );

  // --- Room scene defaults to the artwork's venue and can be switched.
  const sceneState = await page.evaluate(() => ({
    options: [...document.querySelectorAll("fieldset button")].map((b) => b.textContent.trim()),
    active: document.querySelector("fieldset button[aria-pressed=true]")?.textContent.trim(),
  }));
  record(
    vp.name,
    "room scene defaults to the artwork's primary venue",
    sceneState.active === "Office reception",
    `active: ${sceneState.active}`,
  );
  record(
    vp.name,
    "all venue scenes are offered",
    sceneState.options.length === 6,
    sceneState.options.join(", "),
  );

  await page.locator("fieldset button", { hasText: "Classroom" }).click();
  await page.waitForTimeout(220);
  const switched = await page.evaluate(() => ({
    caption: document.querySelector("figcaption")?.textContent ?? "",
    pressed: [...document.querySelectorAll("fieldset button[aria-pressed=true]")].length,
  }));
  record(
    vp.name,
    "switching scene updates the preview and its caption",
    /classroom/i.test(switched.caption) && /75 cm desk/.test(switched.caption) && switched.pressed === 1,
    switched.caption.trim().slice(0, 70),
  );

  // --- Fullscreen viewer: opens, traps scroll, closes on Escape, restores focus.
  await page.locator("[role=tab]", { hasText: /^Artwork$/ }).click();
  await page.waitForTimeout(150);
  await page.locator("main button[aria-label*='full screen']").click();
  await page.waitForTimeout(250);
  const opened = await page.evaluate(() => {
    const d = document.querySelector("[role=dialog]");
    const img = d?.querySelector("img");
    const r = img?.getBoundingClientRect();
    return {
      present: Boolean(d),
      modal: d?.getAttribute("aria-modal"),
      scrollLocked: document.documentElement.style.overflow === "hidden",
      ratio: r && r.height ? Math.round((r.width / r.height) * 100) / 100 : 0,
      focusInDialog: Boolean(d && d.contains(document.activeElement)),
    };
  });
  record(vp.name, "fullscreen viewer opens as a modal dialog", opened.present && opened.modal === "true");
  record(vp.name, "fullscreen viewer locks page scroll", opened.scrollLocked);
  record(
    vp.name,
    "fullscreen image keeps the artwork ratio",
    near(opened.ratio, 2.5, 0.12),
    `ratio ${opened.ratio}`,
  );
  record(vp.name, "focus moves into the dialog", opened.focusInDialog);

  await page.keyboard.press("Escape");
  // Wait past the exit animation — Motion animates with JS, so the CSS
  // override injected above does not shorten it.
  await page.waitForTimeout(800);
  const closed = await page.evaluate(() => ({
    gone: !document.querySelector("[role=dialog]"),
    scrollRestored: document.documentElement.style.overflow !== "hidden",
    focusOnOpener: /full screen/i.test(document.activeElement?.getAttribute("aria-label") ?? ""),
  }));
  record(vp.name, "Escape closes the fullscreen viewer", closed.gone);
  record(vp.name, "page scroll is restored on close", closed.scrollRestored);
  record(vp.name, "focus returns to the trigger", closed.focusOnOpener);
}

async function testArPanel(page, vp) {
  await page.goto(`${BASE}/portfolio/sabr`, { waitUntil: "networkidle" });

  const arTab = page.locator("[role=tab]", { hasText: "On your wall" });
  const hasTab = (await arTab.count()) > 0;
  record(vp.name, "AR view is offered for a size with generated assets", hasTab);
  if (!hasTab) return;

  await arTab.click();
  await page.waitForFunction(
    () => Boolean(document.querySelector("model-viewer")),
    undefined,
    { timeout: 20000 },
  );

  /**
   * Read the `src` PROPERTY, not the attribute. Once the custom element
   * upgrades, React assigns to the property and model-viewer does not reflect
   * it back — so the attribute goes stale while the element loads the right
   * model. The property is what the element and the AR handoff actually use.
   */
  const attrs = await page.evaluate(() => {
    const mv = document.querySelector("model-viewer");
    return {
      src: mv.src ?? mv.getAttribute("src"),
      iosSrc: mv.getAttribute("ios-src"),
      placement: mv.getAttribute("ar-placement"),
      scale: mv.getAttribute("ar-scale"),
      modes: mv.getAttribute("ar-modes"),
      hasAr: mv.hasAttribute("ar"),
    };
  });

  record(
    vp.name,
    "AR model points at the selected size's assets",
    attrs.src === "/ar/sabr/l.glb" && attrs.iosSrc === "/ar/sabr/l.usdz",
    `${attrs.src} / ${attrs.iosSrc}`,
  );
  record(
    vp.name,
    "wall placement and fixed scale are set",
    attrs.hasAr && attrs.placement === "wall" && attrs.scale === "fixed",
    `placement=${attrs.placement} scale=${attrs.scale}`,
  );
  record(
    vp.name,
    "AR modes prefer WebXR then hand off",
    attrs.modes === "webxr scene-viewer quick-look",
    attrs.modes ?? "",
  );

  // A separate USDZ is mandatory: model-viewer's own generator emits
  // horizontal anchoring, so wall placement on iOS depends on ios-src.
  record(vp.name, "a pre-built USDZ is supplied for iOS", Boolean(attrs.iosSrc));

  // Assets must actually be served, and with types the platforms accept.
  const assets = await page.evaluate(async () => {
    const check = async (url) => {
      const res = await fetch(url, { method: "GET" });
      return { status: res.status, type: res.headers.get("content-type") };
    };
    return {
      glb: await check("/ar/sabr/l.glb"),
      usdz: await check("/ar/sabr/l.usdz"),
    };
  });
  record(
    vp.name,
    "GLB is served as model/gltf-binary",
    assets.glb.status === 200 && /model\/gltf-binary/.test(assets.glb.type ?? ""),
    `${assets.glb.status} ${assets.glb.type}`,
  );
  record(
    vp.name,
    "USDZ is served as model/vnd.usdz+zip",
    assets.usdz.status === 200 && /model\/vnd\.usdz\+zip/.test(assets.usdz.type ?? ""),
    `${assets.usdz.status} ${assets.usdz.type}`,
  );

  // The promise is that an AR affordance never dead-ends. Where AR cannot run,
  // the panel must explain that rather than offer a button that does nothing.
  const fallback = await page.evaluate(() => {
    const panel = document.querySelector("[role=tabpanel]");
    const buttons = [...(panel?.querySelectorAll("button") ?? [])].map((b) =>
      b.textContent.trim(),
    );
    return { text: panel?.textContent ?? "", buttons };
  });
  const offersLaunch = fallback.buttons.some((b) => /place on my wall/i.test(b));
  const explains = /cannot place|needs a phone|not available/i.test(fallback.text);
  record(
    vp.name,
    "AR panel either offers a working launch or explains why it cannot",
    offersLaunch !== explains,
    offersLaunch ? "launch offered" : explains ? "explained" : "neither — dead end",
  );

  // Switching size must repoint the model, never leave the previous one up.
  await page.locator("main button", { hasText: /^Small/ }).first().click();
  // Wait on the condition rather than a fixed delay: model-viewer reloads the
  // asset when src changes, and a timeout tuned on one machine is a flake
  // waiting to happen on another.
  await page
    .waitForFunction(
      () => {
        const mv = document.querySelector("model-viewer");
        return (mv?.src ?? mv?.getAttribute("src")) === "/ar/sabr/s.glb";
      },
      undefined,
      { timeout: 8000 },
    )
    .catch(() => {});
  const afterResize = await page.evaluate(() => {
    const mv = document.querySelector("model-viewer");
    return mv ? { src: mv.src ?? mv.getAttribute("src"), ios: mv.getAttribute("ios-src") } : null;
  });
  record(
    vp.name,
    "changing size repoints the AR model",
    afterResize?.src === "/ar/sabr/s.glb" && afterResize?.ios === "/ar/sabr/s.usdz",
    afterResize ? `${afterResize.src}` : "model-viewer gone",
  );
}

async function testTextConfigurator(page, vp) {
  // Only text pieces are configurable; a non-text piece must not offer it.
  await page.goto(`${BASE}/portfolio/meridian-seven`, { waitUntil: "networkidle" });
  record(
    vp.name,
    "configurator is not offered on a non-text piece",
    (await page.locator("[role=tab]", { hasText: "Make it yours" }).count()) === 0,
  );

  await page.goto(`${BASE}/portfolio/sabr`, { waitUntil: "networkidle" });
  const tab = page.locator("[role=tab]", { hasText: "Make it yours" });
  record(vp.name, "configurator is offered on a text piece", (await tab.count()) > 0);
  if ((await tab.count()) === 0) return;

  await tab.click();
  await page.waitForTimeout(400);

  const preview = () =>
    page.evaluate(() => {
      const p = document.querySelector("[role=tabpanel] p");
      if (!p) return null;
      const s = getComputedStyle(p);
      const ground = p.parentElement ? getComputedStyle(p.parentElement).backgroundColor : "";
      return {
        text: p.textContent ?? "",
        family: s.fontFamily,
        colour: s.color,
        style: s.fontStyle,
        fontSize: parseFloat(s.fontSize),
        ground,
      };
    });

  const initial = await preview();
  record(
    vp.name,
    "preview starts from the piece's own words",
    initial?.text.trim() === "Sabr",
    initial?.text.trim(),
  );

  // Typing must drive the preview, and longer text must be set smaller so it
  // fits rather than running off the canvas.
  await page.fill('[role=tabpanel] textarea', "Begin again\nevery morning");
  await page.waitForTimeout(300);
  const afterText = await preview();
  record(
    vp.name,
    "typing updates the preview",
    /Begin again/.test(afterText?.text ?? ""),
    afterText?.text.replace(/\n/g, " / "),
  );
  record(
    vp.name,
    "longer wording is set smaller so it fits",
    Boolean(afterText && initial && afterText.fontSize < initial.fontSize),
    `${initial?.fontSize}px → ${afterText?.fontSize}px`,
  );

  // Each control must actually change the rendered result.
  await page.locator("[role=tabpanel] button", { hasText: "Classical" }).click();
  await page.waitForTimeout(250);
  const afterFace = await preview();
  record(
    vp.name,
    "changing the voice changes the typeface",
    Boolean(afterFace && afterText && afterFace.family !== afterText.family),
    afterFace?.family?.slice(0, 40),
  );

  await page.locator("[role=tabpanel] button", { hasText: "Brass" }).click();
  await page.waitForTimeout(250);
  const afterInk = await preview();
  record(
    vp.name,
    "changing the ink changes the text colour",
    Boolean(afterInk && afterFace && afterInk.colour !== afterFace.colour),
    afterInk?.colour,
  );

  // Ink on a ground of the same tone must be called out rather than accepted.
  await page.locator("[role=tabpanel] fieldset", { hasText: "Ground" })
    .locator("button", { hasText: "Ink" })
    .click();
  await page.waitForTimeout(250);
  await page.locator("[role=tabpanel] fieldset", { hasText: "Ink" })
    .first()
    .locator("button", { hasText: /^Ink$/ })
    .click();
  await page.waitForTimeout(300);
  const warning = await page.evaluate(
    () => document.querySelector("[role=tabpanel] [role=status]")?.textContent ?? "",
  );
  record(
    vp.name,
    "an unreadable ink and ground combination is flagged",
    /hard to read/i.test(warning),
    warning.slice(0, 60),
  );

  // The configuration must survive the trip to the inquiry form.
  await page.locator("[role=tabpanel] a", { hasText: "Send this configuration" }).click();
  await page.waitForURL(/\/contact\?/, { timeout: 10000 });
  const carried = await page.evaluate(() => ({
    url: location.search,
    message: document.querySelector('main form textarea[name="message"]')?.value ?? "",
    heading: document.querySelector("main h2")?.textContent ?? "",
  }));
  record(
    vp.name,
    "configuration is carried in the URL",
    /artwork=sabr/.test(carried.url) && /typeface=/.test(carried.url),
    carried.url.slice(0, 80),
  );
  record(
    vp.name,
    "the inquiry opens pre-written with the configuration",
    /configured Sabr/i.test(carried.message) && /Begin again/.test(carried.message),
    carried.message.slice(0, 80).replace(/\n/g, " / "),
  );
}

async function testPortfolioFiltering(page, vp) {
  await page.goto(`${BASE}/portfolio`, { waitUntil: "networkidle" });
  const total = await page.locator('main a[href^="/portfolio/"]').count();

  await page.goto(`${BASE}/portfolio?venue=school`, { waitUntil: "networkidle" });
  const filtered = await page.locator('main a[href^="/portfolio/"]').count();
  const activeChip = await page.locator('main a[aria-current="page"]').first().textContent();

  record(
    vp.name,
    "venue filter narrows the grid server-side",
    filtered > 0 && filtered < total,
    `${filtered} of ${total}`,
  );
  record(vp.name, "active filter is marked for assistive tech", /school/i.test(activeChip ?? ""), activeChip ?? "");

  // Combining both filters must apply both, not replace one.
  await page.goto(`${BASE}/portfolio?venue=office&collection=words-at-work`, {
    waitUntil: "networkidle",
  });
  const combined = await page.evaluate(() => ({
    count: document.querySelectorAll('main a[href^="/portfolio/"]').length,
    marked: [...document.querySelectorAll('main a[aria-current="page"]')].map((a) =>
      a.textContent.trim(),
    ),
  }));
  record(
    vp.name,
    "venue and collection filters combine",
    combined.count > 0 && combined.marked.length === 2,
    `${combined.count} results, marked: ${combined.marked.join(" + ")}`,
  );

  // Every card must be a real crawlable anchor.
  const hrefs = await page.evaluate(() =>
    [...document.querySelectorAll('main a[href^="/portfolio/"]')].every((a) => a.getAttribute("href")),
  );
  record(vp.name, "artwork cards are real anchors", hrefs);
}

async function testGridReveals(page, vp) {
  await page.goto(`${BASE}/portfolio`, { waitUntil: "networkidle" });

  // Nothing above the fold may start hidden, or the first paint looks broken.
  const initiallyHiddenInView = await page.evaluate(() => {
    const vh = window.innerHeight;
    return [...document.querySelectorAll("main li.reveal")].filter((li) => {
      const r = li.getBoundingClientRect();
      const inView = r.top < vh * 0.6 && r.bottom > 0;
      return inView && parseFloat(getComputedStyle(li).opacity) < 0.9;
    }).length;
  });
  record(
    vp.name,
    "items visible on load are not left hidden",
    initiallyHiddenInView === 0,
    `${initiallyHiddenInView} hidden in first viewport`,
  );

  // Scroll the way a reader does, in steps, then assert everything revealed.
  await page.evaluate(async () => {
    document.documentElement.style.scrollBehavior = "auto";
    const step = window.innerHeight * 0.7;
    for (let y = 0; y <= document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 90));
    }
  });
  await page.waitForTimeout(900);

  const hidden = await page.evaluate(() => {
    const items = [...document.querySelectorAll("main li.reveal")];
    return {
      total: items.length,
      faded: items.filter((li) => parseFloat(getComputedStyle(li).opacity) < 0.9).length,
    };
  });
  record(
    vp.name,
    "all grid items reveal as the page is scrolled",
    hidden.total > 0 && hidden.faded === 0,
    `${hidden.faded} of ${hidden.total} still faded`,
  );
}

async function testInquiryForm(page, vp) {
  /**
   * Each context submits from its own apparent address. The server rate-limits
   * inquiries per IP, so without this the suite trips its own limiter after a
   * couple of runs and reports a false failure — while a genuine limiter
   * regression would hide behind the same symptom.
   */
  await page.setExtraHTTPHeaders({
    "x-forwarded-for": `203.0.113.${Math.floor(Math.random() * 200) + 10}`,
  });
  await page.goto(`${BASE}/contact`, { waitUntil: "networkidle" });

  const form = page.locator("main form").first();
  record(vp.name, "inquiry form is present", (await form.count()) > 0);
  if ((await form.count()) === 0) return;

  // Every field must be labelled — this is the only path to a sale.
  const labelling = await page.evaluate(() => {
    const controls = [...document.querySelectorAll("main form input, main form select, main form textarea")];
    const visible = controls.filter((c) => c.offsetParent !== null);
    const unlabelled = visible.filter((c) => {
      if (c.getAttribute("aria-label")) return false;
      const id = c.getAttribute("id");
      return !id || !document.querySelector(`label[for="${CSS.escape(id)}"]`);
    });
    return {
      total: visible.length,
      unlabelled: unlabelled.map((c) => c.getAttribute("name") ?? c.tagName),
      /**
       * The honeypot is positioned off-screen rather than display:none, since
       * that is harder for a bot to detect. "Hidden from people" therefore
       * means: outside the viewport, not focusable, and not announced.
       */
      honeypot: (() => {
        const hp = document.querySelector('main form input[name="website"]');
        if (!hp) return { present: false };
        const rect = hp.getBoundingClientRect();
        return {
          present: true,
          offScreen: rect.right < 0 || rect.bottom < 0 || rect.left > window.innerWidth,
          notFocusable: hp.tabIndex === -1,
          notAnnounced: Boolean(hp.closest("[aria-hidden='true']")),
        };
      })(),
    };
  });
  record(
    vp.name,
    "every visible form control is labelled",
    labelling.unlabelled.length === 0,
    labelling.unlabelled.join(", "),
  );
  const hp = labelling.honeypot;
  record(
    vp.name,
    "honeypot is present, off-screen, unfocusable and unannounced",
    Boolean(hp.present && hp.offScreen && hp.notFocusable && hp.notAnnounced),
    JSON.stringify(hp),
  );

  // Server-side validation must reject an empty submission and say why.
  await page.locator('main form button[type="submit"]').click();
  await page.waitForTimeout(1500);
  const afterEmpty = await page.evaluate(() => ({
    alert: document.querySelector("main form [role=alert]")?.textContent?.trim() ?? "",
    invalid: document.querySelectorAll('main form [aria-invalid="true"]').length,
  }));
  record(
    vp.name,
    "empty submission is rejected with an explanation",
    afterEmpty.alert.length > 0,
    afterEmpty.alert.slice(0, 60),
  );
  record(
    vp.name,
    "invalid fields are marked for assistive tech",
    afterEmpty.invalid > 0,
    `${afterEmpty.invalid} marked`,
  );

  // A complete submission must be accepted and acknowledged with a reference.
  await page.fill('main form input[name="name"]', "Ayesha Khan");
  await page.fill('main form input[name="email"]', "ayesha@example.com");
  await page.fill('main form input[name="city"]', "Karachi");
  await page.selectOption('main form select[name="venue"]', "office");
  await page.fill(
    'main form textarea[name="message"]',
    "We are fitting out a new reception and want a large piece for the wall behind the desk.",
  );
  await page.locator('main form button[type="submit"]').click();
  await page.waitForTimeout(2500);

  const afterValid = await page.evaluate(() => {
    const status = document.querySelector("main [role=status]");
    return {
      text: status?.textContent?.trim() ?? "",
      formGone: document.querySelectorAll("main form").length === 0,
    };
  });
  record(
    vp.name,
    "a complete inquiry is accepted",
    /thank you/i.test(afterValid.text),
    afterValid.text.slice(0, 60),
  );
  record(
    vp.name,
    "acknowledgement includes a reference",
    /INQ-/.test(afterValid.text),
    afterValid.text.slice(0, 80),
  );
  record(
    vp.name,
    "WhatsApp remains offered after submitting",
    await page.evaluate(() =>
      Boolean(document.querySelector('main a[href*="wa.me"]')),
    ),
  );
}

/**
 * Repeated submissions from one address must be refused, and refused in a way
 * that still points somewhere useful. Runs once rather than per viewport,
 * since it deliberately exhausts a bucket.
 */
async function testRateLimit(browser) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    extraHTTPHeaders: { "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 200) + 10}` },
  });
  const page = await context.newPage();

  let limitedAt = 0;
  for (let attempt = 1; attempt <= 7 && !limitedAt; attempt++) {
    await page.goto(`${BASE}/contact`, { waitUntil: "networkidle" });
    await page.fill('main form input[name="name"]', `Repeat Sender ${attempt}`);
    await page.fill('main form input[name="email"]', `repeat${attempt}@example.com`);
    await page.fill('main form input[name="city"]', "Lahore");
    await page.selectOption('main form select[name="venue"]', "cafe");
    await page.fill(
      'main form textarea[name="message"]',
      "Checking that repeated submissions from one address are refused.",
    );
    await page.locator('main form button[type="submit"]').click();
    await page.waitForTimeout(1200);
    const text = await page.evaluate(
      () => document.querySelector("main [role=alert]")?.textContent ?? "",
    );
    if (/try again in about/i.test(text)) limitedAt = attempt;
  }

  record(
    "rate-limit",
    "repeated inquiries from one address are eventually refused",
    limitedAt > 0 && limitedAt <= 7,
    limitedAt ? `refused on attempt ${limitedAt}` : "never refused after 7 attempts",
  );
  record(
    "rate-limit",
    "the refusal still points to another channel",
    await page.evaluate(() =>
      /whatsapp/i.test(document.querySelector("main [role=alert]")?.textContent ?? ""),
    ),
  );

  await context.close();
}

async function testMobileNav(page, vp) {
  if (vp.width >= 768) return;
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const toggle = page.locator('button[aria-controls="mobile-menu"]');
  await toggle.click();
  await page.waitForTimeout(200);
  const open = await page.evaluate(() => ({
    expanded: document.querySelector('button[aria-controls="mobile-menu"]')?.getAttribute("aria-expanded"),
    menu: Boolean(document.getElementById("mobile-menu")),
    links: document.querySelectorAll("#mobile-menu a").length,
    locked: document.documentElement.style.overflow === "hidden",
  }));
  record(vp.name, "mobile menu opens with correct aria state", open.expanded === "true" && open.menu);
  record(vp.name, "mobile menu lists all routes", open.links >= 5, `${open.links} links`);
  record(vp.name, "mobile menu locks page scroll", open.locked);

  // Navigating must close it and release the scroll lock.
  await page.locator("#mobile-menu a", { hasText: "Services" }).click();
  await page.waitForTimeout(700);
  const afterNav = await page.evaluate(() => ({
    menu: Boolean(document.getElementById("mobile-menu")),
    locked: document.documentElement.style.overflow === "hidden",
    path: location.pathname,
  }));
  record(
    vp.name,
    "mobile menu closes after navigation and releases scroll",
    !afterNav.menu && !afterNav.locked && afterNav.path === "/services",
    `path ${afterNav.path}`,
  );
}

async function testReducedMotion(browser) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/portfolio`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  // Under reduced motion NOTHING may be hidden, including items far below the
  // fold that no observer has reached — visibility must not depend on JS.
  const state = await page.evaluate(() => {
    const items = [...document.querySelectorAll("main li.reveal")];
    const faded = items.filter((li) => parseFloat(getComputedStyle(li).opacity) < 0.9);
    return {
      count: items.length,
      faded: faded.length,
      progressBar: [...document.querySelectorAll(".scroll-progress")].filter(
        (el) => getComputedStyle(el).display !== "none",
      ).length,
    };
  });
  record(
    "reduced-motion",
    "all content is visible without any scrolling",
    state.count > 0 && state.faded === 0,
    `${state.count} items, ${state.faded} faded`,
  );
  record(
    "reduced-motion",
    "decorative scroll progress bar is hidden",
    state.progressBar === 0,
  );

  await page.goto(`${BASE}/portfolio/meridian-seven`, { waitUntil: "networkidle" });
  await page.locator("main button[aria-label*='full screen']").click();
  await page.waitForTimeout(250);
  const dialogOpacity = await page.evaluate(() => {
    const d = document.querySelector("[role=dialog]");
    return d ? parseFloat(getComputedStyle(d).opacity) : -1;
  });
  record(
    "reduced-motion",
    "fullscreen viewer appears instantly at full opacity",
    dialogOpacity > 0.95,
    `opacity ${dialogOpacity}`,
  );
  await context.close();
}

async function main() {
  const browser = await chromium.launch();

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      hasTouch: vp.touch,
      isMobile: vp.touch && vp.width < 768,
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text().slice(0, 160));
    });

    await testArtworkPage(page, vp);
    await testArPanel(page, vp);
    await testTextConfigurator(page, vp);
    await testPortfolioFiltering(page, vp);
    await testGridReveals(page, vp);
    await testInquiryForm(page, vp);
    await testMobileNav(page, vp);

    record(vp.name, "no console errors during interaction", errors.length === 0, errors.slice(0, 2).join(" | "));
    await context.close();
  }

  await testReducedMotion(browser);
  await testRateLimit(browser);
  await browser.close();

  const failed = results.filter((r) => !r.pass);
  const byViewport = {};
  for (const r of results) (byViewport[r.viewport] ??= []).push(r);

  for (const [vp, list] of Object.entries(byViewport)) {
    const bad = list.filter((r) => !r.pass).length;
    console.log(`\n${vp} — ${list.length - bad}/${list.length} passed`);
    for (const r of list) {
      if (!r.pass) console.log(`  FAIL  ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
    }
  }

  console.log(
    `\n${results.length - failed.length}/${results.length} checks passed across ${Object.keys(byViewport).length} contexts.`,
  );
  if (failed.length) {
    console.log("RESULT: FAIL\n");
    process.exit(1);
  }
  console.log("RESULT: PASS\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
