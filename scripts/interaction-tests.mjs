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

/**
 * Keyboard access.
 *
 * Lighthouse scores accessibility 100 on every route and still says nothing
 * about any of this: it does not press Tab. These are the failures that only
 * appear when someone actually navigates by keyboard — an invisible focus ring,
 * a control that cannot be reached, a dialog that lets focus escape behind it.
 */
async function testKeyboardNavigation(page, vp) {
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });

  // The skip link must be the first stop, or a keyboard user walks the whole
  // header on every page load.
  await page.keyboard.press("Tab");
  const first = await page.evaluate(() => {
    const el = document.activeElement;
    return { href: el?.getAttribute("href") ?? "", visible: el ? el.getBoundingClientRect().width > 0 : false };
  });
  record(vp.name, "first tab stop is the skip link", first.href === "#content", `focused href: ${first.href}`);
  record(vp.name, "skip link becomes visible when focused", first.visible);

  await page.keyboard.press("Enter");
  const skipped = await page.evaluate(() => {
    const main = document.getElementById("content");
    return {
      hash: location.hash,
      focusInMain: Boolean(main && main.contains(document.activeElement)),
    };
  });
  record(
    vp.name,
    "skip link moves past the header",
    skipped.hash === "#content" || skipped.focusInMain,
    `hash ${skipped.hash}`,
  );

  // A positive tabindex reorders the tab sequence away from the reading order,
  // which is a defect wherever it appears.
  const positiveTabindex = await page.evaluate(
    () =>
      [...document.querySelectorAll("[tabindex]")].filter(
        (el) => Number(el.getAttribute("tabindex")) > 0,
      ).length,
  );
  record(vp.name, "no positive tabindex reorders the tab sequence", positiveTabindex === 0);

  /**
   * Walk the tab order and require every stop to render an indicator. The site
   * sets one globally on :focus-visible, so a failure here means something
   * suppressed it locally — which is exactly the edit that is easy to make and
   * impossible to notice with a mouse.
   */
  const noIndicator = [];
  let stops = 0;
  let stuck = 0;
  for (let i = 0; i < 45; i += 1) {
    await page.keyboard.press("Tab");
    const stop = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body || el === document.documentElement) return null;
      const cs = getComputedStyle(el);
      const outlined = cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0;
      const shadowed = cs.boxShadow !== "none" && cs.boxShadow !== "";
      // Identity has to be the element itself. Comparing a tag-and-class
      // string reported every pair of sibling nav links as the same control,
      // so the trap check failed on a page with no trap at all.
      const repeat = el.hasAttribute("data-kbd-seen");
      el.setAttribute("data-kbd-seen", "");
      return {
        id: `${el.tagName}.${(el.getAttribute("class") ?? "").slice(0, 40)}`,
        label: (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 40),
        indicated: outlined || shadowed,
        repeat,
      };
    });
    if (!stop) break;
    stops += 1;
    if (!stop.indicated) noIndicator.push(`${stop.id} "${stop.label}"`);
    // A repeat before the sequence has wrapped means focus is going backwards
    // into somewhere it has already been, which is what a trap looks like.
    if (stop.repeat && stops < 12) stuck += 1;
  }

  record(
    vp.name,
    "every tab stop shows a focus indicator",
    noIndicator.length === 0,
    noIndicator.slice(0, 3).join(" | "),
  );
  record(vp.name, "tabbing is not trapped on a single control", stuck === 0);
  record(vp.name, "the header and page are reachable by keyboard", stops >= 8, `${stops} stops`);
}

/**
 * An overlay that declares aria-modal="true" must not leak focus to the page
 * behind it. Both overlays here are divs rather than native `<dialog>`
 * elements, so nothing traps focus for them and Tab used to walk straight out
 * into content the overlay was covering.
 */
async function testDialogFocusTrap(page, vp) {
  await page.goto(`${BASE}/portfolio/idea-bulb`, { waitUntil: "networkidle" });
  await page.locator("[role=tab]", { hasText: /^Artwork$/ }).click();
  await page.locator("main button[aria-label*='full screen']").click();

  const open = await page
    .waitForFunction(() => Boolean(document.querySelector("[role=dialog][aria-modal=true]")), null, {
      timeout: 4000,
    })
    .then(() => true)
    .catch(() => false);
  if (!open) {
    record(vp.name, "fullscreen viewer opens for the focus-trap check", false);
    return;
  }

  // Enough presses to run past the controls inside and off the end.
  const escaped = [];
  for (let i = 0; i < 12; i += 1) {
    await page.keyboard.press("Tab");
    const where = await page.evaluate(() => {
      const dlg = document.querySelector("[role=dialog][aria-modal=true]");
      const el = document.activeElement;
      if (!dlg || !el) return "no-dialog";
      if (dlg.contains(el)) return "inside";
      return `${el.tagName}.${(el.getAttribute("class") ?? "").slice(0, 30)}`;
    });
    if (where !== "inside") escaped.push(`press ${i + 1}: ${where}`);
  }
  record(
    vp.name,
    "focus stays inside the open viewer while tabbing",
    escaped.length === 0,
    escaped.slice(0, 2).join(" | "),
  );

  // Shift+Tab off the front must wrap backwards rather than fall out.
  for (let i = 0; i < 4; i += 1) await page.keyboard.press("Shift+Tab");
  const backwards = await page.evaluate(() => {
    const dlg = document.querySelector("[role=dialog][aria-modal=true]");
    return Boolean(dlg && dlg.contains(document.activeElement));
  });
  record(vp.name, "shift-tabbing off the front wraps inside the viewer", backwards);

  await page.keyboard.press("Escape");
  await page
    .waitForFunction(() => !document.querySelector("[role=dialog][aria-modal=true]"), null, {
      timeout: 3000,
    })
    .catch(() => {});
}

async function testArtworkPage(page, vp) {
  // A panoramic piece exercises the aspect handling most strictly.
  await page.goto(`${BASE}/portfolio/ask-better-questions`, { waitUntil: "networkidle" });
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
  await page.goto(`${BASE}/portfolio/ask-better-questions?size=xl`, { waitUntil: "networkidle" });
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
    // This group uses a panoramic piece specified for universities first, so
    // the classroom is the correct default. Pinned to the piece, not a scene.
    sceneState.active === "Classroom",
    `active: ${sceneState.active}`,
  );
  record(
    vp.name,
    "all venue scenes are offered",
    sceneState.options.length === 6,
    sceneState.options.join(", "),
  );

  await page.locator("fieldset button", { hasText: "Office reception" }).click();
  await page.waitForTimeout(220);
  const switched = await page.evaluate(() => ({
    caption: document.querySelector("figcaption")?.textContent ?? "",
    pressed: [...document.querySelectorAll("fieldset button[aria-pressed=true]")].length,
  }));
  record(
    vp.name,
    "switching scene updates the preview and its caption",
    /office reception/i.test(switched.caption) && /110 cm reception desk/.test(switched.caption) && switched.pressed === 1,
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

  /**
   * The pre-built model must be a frameless plane, not a panel.
   *
   * These are cut letters with the wall showing between them, so the honest
   * model has no substrate: an alpha-masked plane puts the letters on the
   * visitor's real wall and leaves the wall visible. A non-zero depth here means
   * the box geometry came back and AR is showing a rectangular panel carrying a
   * picture of the piece.
   *
   * Width and height are checked by `npm run check:ar` across all 112 pairs;
   * this is the shape assertion, which that validator deliberately does not make.
   */
  await page
    .waitForFunction(() => document.querySelector("model-viewer")?.loaded === true, null, {
      timeout: 15000,
    })
    .catch(() => {});
  const shape = await page.evaluate(() => {
    const mv = document.querySelector("model-viewer");
    const d = mv?.getDimensions?.();
    return {
      prebuilt: (mv?.getAttribute("src") ?? "").startsWith("/ar/"),
      depth: d ? Number(d.z.toFixed(4)) : null,
      width: d ? Number(d.x.toFixed(3)) : null,
    };
  });
  record(
    vp.name,
    "the pre-built AR model is a frameless plane, not a panel",
    shape.prebuilt && shape.depth === 0,
    `src prebuilt=${shape.prebuilt} depth=${shape.depth}`,
  );

  /**
   * model-viewer's own progress bar has to stay out of the panel. It hides
   * itself by adding a class when loading completes, and that never fired here
   * — the element upgrades lazily and gets its `src` as a property afterwards,
   * so the terminal progress event landed before anything was listening. The
   * bar then sat across the top of the panel permanently. A stylesheet rule
   * removes it; this is what notices if the rule goes.
   */
  await page
    .waitForFunction(() => document.querySelector("model-viewer")?.loaded === true, null, {
      timeout: 8000,
    })
    .catch(() => {});
  const progressBar = await page.evaluate(() => {
    const mv = document.querySelector("model-viewer");
    const bar = mv?.shadowRoot?.querySelector("div.bar");
    if (!bar) return { loaded: mv?.loaded ?? false, visible: false };
    const rect = bar.getBoundingClientRect();
    return {
      loaded: mv.loaded,
      visible: getComputedStyle(bar).display !== "none" && rect.height > 0,
    };
  });
  record(
    vp.name,
    "no leftover progress bar once the model has loaded",
    progressBar.loaded && !progressBar.visible,
    `loaded=${progressBar.loaded} barVisible=${progressBar.visible}`,
  );

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
  // Either a real AR launch, or the camera fallback, or a plain explanation —
  // but never a panel with no way forward.
  const offersLaunch = fallback.buttons.some((b) => /place on my wall/i.test(b));
  const offersCamera = fallback.buttons.some((b) => /preview with your camera/i.test(b));
  const explains = /needs a phone or tablet/i.test(fallback.text);
  record(
    vp.name,
    "AR panel always offers a way forward",
    offersLaunch || offersCamera || explains,
    offersLaunch
      ? "AR launch offered"
      : offersCamera
        ? "camera fallback offered"
        : explains
          ? "explained"
          : "nothing — dead end",
  );

  // The camera preview is the universal fallback and must be reachable from
  // this panel whatever tier the device landed on.
  const cameraEntry = await page.evaluate(() => {
    const panel = document.querySelector("[role=tabpanel]");
    return [...(panel?.querySelectorAll("button") ?? [])]
      .map((b) => b.textContent.trim())
      .filter((t) => /camera/i.test(t));
  });
  record(
    vp.name,
    "camera preview is reachable from the AR panel",
    cameraEntry.length > 0,
    cameraEntry.join(" | "),
  );

  if (cameraEntry.length) {
    await page.locator("[role=tabpanel] button", { hasText: /camera/i }).first().click();
    // The overlay is a lazily-loaded chunk, so wait on it appearing rather
    // than on a timeout tuned to a warm cache.
    await page
      .waitForFunction(
        () =>
          [...document.querySelectorAll("[role=dialog]")].some((d) =>
            /camera/i.test(d.getAttribute("aria-label") ?? ""),
          ),
        undefined,
        { timeout: 15000 },
      )
      .catch(() => {});
    const overlay = await page.evaluate(() => {
      const dialogs = [...document.querySelectorAll('[role=dialog][aria-modal="true"]')];
      const camera = dialogs.find((d) => /camera/i.test(d.getAttribute("aria-label") ?? ""));
      return {
        open: Boolean(camera),
        scrollLocked: document.documentElement.style.overflow === "hidden",
        // It must say plainly that this is not tracked AR before asking for
        // the camera, rather than implying capability it does not have.
        honest: /not stay pinned|preview rather than true AR/i.test(camera?.textContent ?? ""),
        hasStart: [...(camera?.querySelectorAll("button") ?? [])].some((b) =>
          /start the camera/i.test(b.textContent ?? ""),
        ),
      };
    });
    record(vp.name, "camera preview opens as a modal", overlay.open);
    record(vp.name, "camera preview locks page scroll", overlay.scrollLocked);
    record(
      vp.name,
      "camera preview is honest about not being tracked AR",
      overlay.honest,
    );
    record(vp.name, "camera preview waits for a tap before requesting access", overlay.hasStart);

    await page.keyboard.press("Escape");
    await page
      .waitForFunction(
        () =>
          ![...document.querySelectorAll("[role=dialog]")].some((d) =>
            /camera/i.test(d.getAttribute("aria-label") ?? ""),
          ),
        undefined,
        { timeout: 8000 },
      )
      .catch(() => {});
    const closed = await page.evaluate(() => ({
      gone: ![...document.querySelectorAll("[role=dialog]")].some((d) =>
        /camera/i.test(d.getAttribute("aria-label") ?? ""),
      ),
      scrollRestored: document.documentElement.style.overflow !== "hidden",
    }));
    record(vp.name, "Escape closes the camera preview", closed.gone);
    record(vp.name, "page scroll is restored after the camera preview", closed.scrollRestored);
  }

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
  await page.goto(`${BASE}/portfolio/idea-bulb`, { waitUntil: "networkidle" });
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
  await page.locator("[role=tabpanel] fieldset", { hasText: "Wall" })
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

async function testWallPlanner(page, vp) {
  await page.goto(`${BASE}/planner`, { waitUntil: "networkidle" });

  const readout = () =>
    page.evaluate(() => document.querySelector("[aria-live=polite]")?.textContent ?? "");
  const problems = () =>
    page.evaluate(() =>
      [...document.querySelectorAll("main [role=status]")].map((n) => n.textContent ?? ""),
    );
  const pieceCount = () =>
    page.evaluate(() => document.querySelectorAll("main [role=img] > div").length);

  const initial = await readout();
  record(
    vp.name,
    "planner opens with an arrangement that fits the default wall",
    /3 pieces spanning/.test(initial) && (await problems()).length === 0,
    initial.slice(0, 70),
  );

  // Making the wall narrower than the arrangement must be reported, with the
  // actual overflow rather than a vague warning.
  await page.fill('main input[type="number"]', "150");
  await page.waitForTimeout(400);
  const narrowProblems = await problems();
  record(
    vp.name,
    "an arrangement wider than the wall is reported with the overflow",
    narrowProblems.some((p) => /wider than the wall/.test(p) && /\d+ cm/.test(p)),
    narrowProblems[0]?.slice(0, 80) ?? "no problem reported",
  );

  await page.fill('main input[type="number"]', "320");
  await page.waitForTimeout(400);

  // Adding and removing pieces.
  const before = await pieceCount();
  await page.locator("main button", { hasText: "Collective" }).first().click();
  await page.waitForTimeout(350);
  const afterAdd = await pieceCount();
  record(vp.name, "adding a piece places it on the wall", afterAdd === before + 1, `${before} → ${afterAdd}`);

  await page.locator('main button[aria-label^="Remove"]').first().click();
  await page.waitForTimeout(350);
  const afterRemove = await pieceCount();
  record(
    vp.name,
    "removing a piece takes it off the wall",
    afterRemove === afterAdd - 1,
    `${afterAdd} → ${afterRemove}`,
  );

  // Arrangements must actually differ from one another.
  const positions = async () =>
    page.evaluate(() =>
      [...document.querySelectorAll("main [role=img] > div")]
        .map((el) => `${el.style.left}|${el.style.bottom}`)
        .join(","),
    );
  const rowPositions = await positions();
  await page.locator("main button", { hasText: "Two rows" }).click();
  await page.waitForTimeout(400);
  const gridPositions = await positions();
  await page.locator("main button", { hasText: "Salon hang" }).click();
  await page.waitForTimeout(400);
  const salonPositions = await positions();

  record(
    vp.name,
    "each arrangement produces a different layout",
    rowPositions !== gridPositions && gridPositions !== salonPositions,
  );

  // Changing a size must change the span.
  await page.locator("main button", { hasText: "Single row" }).click();
  await page.waitForTimeout(300);
  const spanBefore = await readout();
  await page.selectOption("main select", { index: 3 });
  await page.waitForTimeout(400);
  const spanAfter = await readout();
  record(
    vp.name,
    "changing a size changes the measured span",
    spanBefore !== spanAfter,
    spanAfter.slice(0, 60),
  );

  // The arrangement must reach the inquiry form as readable text.
  await page.locator("main a", { hasText: "Send this arrangement" }).click();
  await page.waitForURL(/\/contact/, { timeout: 10000 });
  const message = await page.evaluate(
    () => document.querySelector('main form textarea[name="message"]')?.value ?? "",
  );
  record(
    vp.name,
    "the arrangement reaches the inquiry pre-written",
    /planned a wall arrangement/i.test(message) && /cm/.test(message),
    message.slice(0, 90),
  );
}

/**
 * Printable templates.
 *
 * The geometry that reaches paper is checked by check:print, which measures the
 * sheets in print media and reads the page boxes back out of a generated PDF.
 * What that cannot see is the navigation around them: whether the chips are
 * wired to the URLs they claim, whether the sheet counts printed on them are the
 * counts you get, and whether the artwork page hands over the chosen size.
 *
 * Every step waits on the URL rather than on networkidle. These are client-side
 * navigations with no load event, so networkidle resolves while the previous page
 * is still mounted — which made the first version of this group read every value
 * one step behind and report four failures that were entirely its own.
 */
async function testPrintTemplates(page, vp) {
  await page.goto(`${BASE}/portfolio/sabr`, { waitUntil: "networkidle" });

  // The route has to be reachable from the piece. The href with no query is the
  // one beside the size table; the AR panel's carries a size.
  await page.locator('main a[href$="/template"]').first().click();
  await page.waitForURL(/\/portfolio\/sabr\/template/, { timeout: 5000 });
  record(
    vp.name,
    "the artwork page links through to the template",
    true,
    page.url().replace(BASE, ""),
  );

  const sheetCount = () => page.locator(".tpl-sheet").count();
  const chip = (label) => page.locator("main a", { hasText: label }).first();

  // Specification is the default because it costs one sheet.
  record(vp.name, "the default mode is the one-page specification", (await sheetCount()) === 1);

  // Each chip advertises a sheet count; pressing it has to produce that many.
  for (const [label, mode] of [
    ["Corner marks", "corners"],
    ["Full template", "full"],
  ]) {
    const promised = await chip(label).textContent();
    const n = parseInt((promised ?? "").match(/(\d+)\s+sheets?/)?.[1] ?? "0", 10);
    await chip(label).click();
    await page.waitForURL(new RegExp(`mode=${mode}`), { timeout: 5000 });
    await page.waitForFunction(
      (expected) => document.querySelectorAll(".tpl-sheet").length === expected,
      n,
      { timeout: 5000 },
    ).catch(() => {});
    const actual = await sheetCount();
    record(
      vp.name,
      `"${label}" prints the ${n} sheets it advertises`,
      n > 0 && actual === n,
      `promised ${n}, rendered ${actual}`,
    );
  }

  // Size has to reach the sheets, not just the URL.
  await page.goto(`${BASE}/portfolio/sabr/template?mode=corners&size=s`, {
    waitUntil: "networkidle",
  });
  const small = await page.locator(".tpl-sheet").first().innerText();
  await page.goto(`${BASE}/portfolio/sabr/template?mode=corners&size=xl`, {
    waitUntil: "networkidle",
  });
  const large = await page.locator(".tpl-sheet").first().innerText();
  record(
    vp.name,
    "the chosen size is the size printed on the sheet",
    /45 × 60 cm/.test(small) && /120 × 160 cm/.test(large),
    `${small.match(/\d+ × \d+ cm/)?.[0]} then ${large.match(/\d+ × \d+ cm/)?.[0]}`,
  );

  // A hand-edited or forwarded URL with nonsense in it should still print.
  const res = await page.goto(
    `${BASE}/portfolio/sabr/template?mode=nonsense&paper=a3&size=enormous`,
    { waitUntil: "networkidle" },
  );
  record(
    vp.name,
    "unrecognised query values fall back instead of failing",
    res.status() === 200 && (await sheetCount()) === 1,
    `status ${res.status()}`,
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
    // Success replaces the form with a role=status panel; an undelivered
    // submission keeps the form and puts a role=alert above it. Reading only
    // the first found the success case and nothing else.
    const status =
      document.querySelector("main [role=status]") ?? document.querySelector("main [role=alert]");
    return {
      text: status?.textContent?.trim() ?? "",
      formGone: document.querySelectorAll("main form").length === 0,
    };
  });
  /**
   * A valid submission must end in one of exactly two honest states, and which
   * one depends on whether email delivery is configured for this build.
   *
   * Configured: a thank-you carrying a reference the studio can cite.
   * Not configured: a plain statement that it did not send, plus the two
   * channels that work without any configuration.
   *
   * What must never happen is the third state this used to allow — a thank-you
   * for an inquiry that only reached a log file. So the assertion is on the
   * pair, and the run reports which one it saw.
   */
  const acknowledged = /thank you/i.test(afterValid.text) && /INQ-/.test(afterValid.text);
  const declaredUndelivered =
    /not connected/i.test(afterValid.text) && /whatsapp/i.test(afterValid.text);
  record(
    vp.name,
    "a complete inquiry ends in an honest state, never a false success",
    acknowledged !== declaredUndelivered,
    acknowledged
      ? "acknowledged with a reference"
      : declaredUndelivered
        ? "declared undelivered and offered the direct channels"
        : `neither: ${afterValid.text.slice(0, 70)}`,
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
  const open = await page.evaluate(() => {
    const menu = document.getElementById("mobile-menu");
    const links = [...(menu?.querySelectorAll("a") ?? [])];
    const last = links.at(-1)?.getBoundingClientRect();
    const header = document.querySelector("header")?.getBoundingClientRect();
    const first = links[0]?.getBoundingClientRect();
    return {
      expanded: document
        .querySelector('button[aria-controls="mobile-menu"]')
        ?.getAttribute("aria-expanded"),
      menu: Boolean(menu),
      links: links.length,
      locked: document.documentElement.style.overflow === "hidden",
      panelHeight: menu ? Math.round(menu.getBoundingClientRect().height) : 0,
      viewportHeight: window.innerHeight,
      lastLinkReachable: last ? last.bottom <= window.innerHeight + 1 : false,
      firstLinkClearsHeader: first && header ? first.top >= header.height : false,
    };
  });
  record(vp.name, "mobile menu opens with correct aria state", open.expanded === "true" && open.menu);
  record(vp.name, "mobile menu lists all routes", open.links >= 5, `${open.links} links`);
  record(vp.name, "mobile menu locks page scroll", open.locked);
  /**
   * The panel must fill the viewport.
   *
   * It did not: the header carries backdrop-filter for its translucency, which
   * makes it the containing block for any fixed-position descendant, so a panel
   * nested inside it resolved top/bottom against the header's 65px box. The box
   * collapsed to 64px while its content needed 505px, and overflow-y: auto
   * turned the menu into a scrollable sliver rather than failing visibly. It is
   * portalled to the body now, and this is what notices if that changes.
   */
  record(
    vp.name,
    "mobile menu fills the viewport rather than collapsing",
    Math.abs(open.panelHeight - open.viewportHeight) <= 1,
    `panel ${open.panelHeight}px in a ${open.viewportHeight}px viewport`,
  );
  record(vp.name, "every menu link is reachable without clipping", open.lastLinkReachable);
  record(
    vp.name,
    "the first menu link clears the sticky header",
    open.firstLinkClearsHeader,
  );

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

/**
 * Android AR tiering, which is where the promise "never a dead AR button" is
 * hardest to keep.
 *
 * WebXR and Scene Viewer are both gated on Google Play Services for AR. The
 * detection used to offer Scene Viewer on every Android, reasoning that the app
 * prompts to install itself when absent — but on a handset the Play Store calls
 * "incompatible with this device" there is nothing to install, so the primary
 * button was dead and the only working option was a small link beneath it.
 * Found on a real device, and this is what keeps it from coming back.
 *
 * navigator.xr is overridden rather than trusting a UA string, because that is
 * the actual signal the code reads.
 */
async function testAndroidArTiers(browser) {
  const ANDROID_UA =
    "Mozilla/5.0 (Linux; Android 14; SM-A155F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36";

  const cases = [
    {
      name: "no ARCore: immersive-ar answered no",
      script: () => {
        Object.defineProperty(navigator, "xr", {
          value: { isSessionSupported: async () => false },
          configurable: true,
        });
      },
      // The working action must come first, and the failing one must be
      // labelled with why it will fail.
      expectFirst: /preview with your camera/i,
      expectAlso: /ar viewer anyway/i,
    },
    {
      name: "ARCore present: immersive-ar answered yes",
      script: () => {
        Object.defineProperty(navigator, "xr", {
          value: { isSessionSupported: async () => true },
          configurable: true,
        });
      },
      expectFirst: /place on my wall/i,
      expectAlso: null,
    },
    {
      name: "no navigator.xr at all: support unknown",
      script: () => {
        Object.defineProperty(navigator, "xr", { value: undefined, configurable: true });
      },
      expectFirst: /place on my wall/i,
      expectAlso: /preview it with your camera/i,
    },
  ];

  for (const testCase of cases) {
    const context = await browser.newContext({
      viewport: { width: 393, height: 852 },
      isMobile: true,
      hasTouch: true,
      userAgent: ANDROID_UA,
    });
    const page = await context.newPage();
    await page.addInitScript(testCase.script);
    try {
      await page.goto(`${BASE}/portfolio/sabr`, { waitUntil: "networkidle" });
      await page.locator("[role=tab]", { hasText: /^On your wall$/ }).click();
      await page
        .waitForFunction(
          () =>
            [...document.querySelectorAll("[role=tabpanel]")].some(
              (el) => !el.hidden && /camera|my wall/i.test(el.textContent ?? ""),
            ),
          null,
          { timeout: 8000 },
        )
        .catch(() => {});
      const actions = (
        await page.locator("[role=tabpanel]:not([hidden]) button, [role=tabpanel]:not([hidden]) a").allInnerTexts()
      )
        .map((t) => t.replace(/\s+/g, " ").trim())
        .filter(Boolean);

      record(
        "android-ar",
        `${testCase.name} — the first action is the one that works`,
        Boolean(actions[0] && testCase.expectFirst.test(actions[0])),
        actions.join(" | ").slice(0, 110),
      );
      if (testCase.expectAlso) {
        record(
          "android-ar",
          `${testCase.name} — the other path stays reachable`,
          actions.some((a) => testCase.expectAlso.test(a)),
          actions.join(" | ").slice(0, 110),
        );
      }
    } catch (err) {
      record("android-ar", `${testCase.name} completed without throwing`, false, String(err).slice(0, 110));
    }
    await context.close();
  }
}

/**
 * A device that claims AR and then cannot deliver it.
 *
 * `isSessionSupported("immersive-ar")` is a capability claim, not an
 * availability guarantee: Chrome on Android answers true whenever the browser
 * supports AR, without checking that Google Play Services for AR is installed
 * or installable. A real handset reported immersive-ar AND immersive-vr as
 * supported — both untrue in practice — took the WebXR path, and dropped the
 * visitor on a "Google Play Services for AR required" screen.
 *
 * Nothing can predict that, so the requirement is recovery: after a failed
 * launch the panel must stop leading with AR and lead with the camera preview,
 * and it must say why.
 */
async function testArFailureRecovery(browser) {
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36",
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "xr", {
      value: {
        isSessionSupported: async () => true,
        requestSession: async () => {
          throw new DOMException("Play Services for AR unavailable", "NotSupportedError");
        },
      },
      configurable: true,
    });
  });

  const actions = async () =>
    (
      await page
        .locator("[role=tabpanel]:not([hidden]) button, [role=tabpanel]:not([hidden]) a")
        .allInnerTexts()
    )
      .map((t) => t.replace(/\s+/g, " ").trim())
      .filter(Boolean);

  try {
    await page.goto(`${BASE}/portfolio/sabr`, { waitUntil: "networkidle" });
    await page.locator("[role=tab]", { hasText: /^On your wall$/ }).click();
    await page
      .waitForFunction(
        () =>
          [...document.querySelectorAll("[role=tabpanel]")].some(
            (el) => !el.hidden && /my wall|camera/i.test(el.textContent ?? ""),
          ),
        null,
        { timeout: 8000 },
      )
      .catch(() => {});

    const before = await actions();
    record(
      "ar-recovery",
      "a device claiming AR support is offered AR",
      Boolean(before[0] && /place on my wall/i.test(before[0])),
      before.join(" | ").slice(0, 90),
    );

    // Wait for the model to be loaded before launching. Clicking earlier gets
    // "the 3D view is still loading", which returns without arming the
    // watchdog — correct behaviour, and it made this test look like the
    // recovery was broken when it was the test that was too quick.
    await page.waitForFunction(
      () => document.querySelector("model-viewer")?.loaded === true,
      null,
      { timeout: 15000 },
    );
    await page.getByRole("button", { name: /place on my wall/i }).click();
    // Past the in-page watchdog, which is what catches a launch that produces
    // no event at all.
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll("[role=tabpanel]")].some(
          (el) => !el.hidden && /preview with your camera/i.test(el.textContent ?? ""),
        ),
      null,
      { timeout: 12000 },
    );

    const after = await actions();
    record(
      "ar-recovery",
      "after a failed launch the camera preview becomes the first action",
      Boolean(after[0] && /preview with your camera/i.test(after[0])),
      after.join(" | ").slice(0, 90),
    );
    record(
      "ar-recovery",
      "AR stays available as a secondary retry",
      after.some((a) => /try ar again/i.test(a)),
      after.join(" | ").slice(0, 90),
    );

    const message = await page.evaluate(
      () =>
        document
          .querySelector("[role=tabpanel]:not([hidden]) [role=status]")
          ?.textContent?.replace(/\s+/g, " ")
          .trim() ?? "",
    );
    record(
      "ar-recovery",
      "the failure names its likely cause rather than saying try again",
      /google play services for ar/i.test(message) &&
        !/^AR could not start\. Please try again\.$/.test(message),
      message.slice(0, 90),
    );
  } catch (err) {
    record("ar-recovery", "failure-recovery group completed without throwing", false, String(err).slice(0, 110));
  }
  await context.close();
}

/**
 * A configured piece must not quietly become the original one.
 *
 * Reported from a phone: customise in "Make it yours", switch back to "On your
 * wall", and the default artwork was shown. Nothing said so, which is the worst
 * version of wrong — the visitor believes they are looking at their own words.
 *
 * The camera preview composites a flat image and can carry the wording; the GLB
 * and USDZ are built ahead of time and cannot. So the requirement is two-sided:
 * the camera preview shows the customer's words, and the panel states that the
 * 3D view does not.
 */
async function testCustomTextReachesPreview(browser) {
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    isMobile: true,
    hasTouch: true,
    permissions: ["camera"],
  });
  const page = await context.newPage();
  try {
    await page.goto(`${BASE}/portfolio/sabr`, { waitUntil: "networkidle" });
    await page.locator("[role=tab]", { hasText: /^Make it yours$/ }).click();
    await page.locator("[role=tabpanel]:not([hidden]) textarea").fill("Rizq\nBarkat");
    // Past the render debounce.
    await page.waitForTimeout(1500);
    await page.locator("[role=tab]", { hasText: /^On your wall$/ }).click();

    /**
     * The 3D stage must show the configured piece, at true size.
     *
     * This is a GLB authored in the browser, and a hand-written binary format is
     * exactly where a subtle error hides — a wrong offset loads as nothing, a
     * wrong unit places a 90cm piece at 90 metres. So the assertions are that
     * model-viewer parsed it and that its measured dimensions are the piece's
     * real ones, which is the whole basis of the true-to-scale claim.
     */
    await page
      .waitForFunction(() => document.querySelector("model-viewer")?.loaded === true, null, {
        timeout: 20000,
      })
      .catch(() => {});
    const model = await page.evaluate(() => {
      const mv = document.querySelector("model-viewer");
      if (!mv) return null;
      const d = mv.getDimensions?.();
      return {
        loaded: mv.loaded === true,
        isCustom: (mv.src ?? "").startsWith("data:model/gltf-binary"),
        iosSrcUnchanged: (mv.getAttribute("ios-src") ?? "").startsWith("/ar/"),
        widthM: d ? Number(d.x.toFixed(3)) : null,
        heightM: d ? Number(d.y.toFixed(3)) : null,
      };
    });
    record(
      "custom-text",
      "the 3D stage loads a model built from the custom wording",
      Boolean(model?.loaded && model.isCustom),
      `loaded=${model?.loaded} custom=${model?.isCustom}`,
    );
    // Sabr at Large is 90 x 120 cm.
    record(
      "custom-text",
      "the custom model is authored at the piece's true size",
      Math.abs((model?.widthM ?? 0) - 0.9) < 0.005 &&
        Math.abs((model?.heightM ?? 0) - 1.2) < 0.005,
      `${model?.widthM} x ${model?.heightM} m, expected 0.9 x 1.2`,
    );
    // Quick Look's handling of cutout alpha is unverified, so iOS must keep the
    // pre-built asset rather than being handed something untested.
    record(
      "custom-text",
      "iOS still receives the pre-built USDZ",
      Boolean(model?.iosSrcUnchanged),
    );

    /**
     * The one difference left has to be stated: iOS gets the original.
     *
     * This assertion used to require the opposite — that the panel said the 3D
     * view could not carry the wording — which was true before the model was
     * built in the browser. Now the 3D view does carry it and only the Quick
     * Look handoff does not, so that is what must be said.
     */
    const noticed = await page
      .waitForFunction(
        () =>
          [...document.querySelectorAll("[role=tabpanel]")].some(
            (el) =>
              !el.hidden &&
              /iphone/i.test(el.textContent ?? "") &&
              /original piece/i.test(el.textContent ?? ""),
          ),
        null,
        { timeout: 10000 },
      )
      .then(() => true)
      .catch(() => false);
    record(
      "custom-text",
      "the panel states that the iPhone AR handoff still opens the original",
      noticed,
    );

    await page.getByRole("button", { name: /preview with your camera/i }).first().click();
    await page.getByRole("button", { name: /start the camera/i }).click().catch(() => {});
    await page.waitForTimeout(2000);

    const overlay = await page.evaluate(() => {
      const dialog = document.querySelector("[role=dialog][aria-modal=true]");
      const img = dialog?.querySelector("img");
      const box = img?.parentElement;
      return {
        usesCustomRender: (img?.getAttribute("src") ?? "").startsWith("data:image/png"),
        boxShadow: box ? getComputedStyle(box).boxShadow : "missing",
        imageFilter: img ? getComputedStyle(img).filter : "missing",
      };
    });
    record(
      "custom-text",
      "the camera preview composites the customer's own wording",
      overlay.usesCustomRender,
      `src starts data:image/png = ${overlay.usesCustomRender}`,
    );
    // The artwork is a transparent PNG of cut letters, so a bordered, shadowed
    // rectangle around it reads as a sheet of paper on the wall.
    record(
      "custom-text",
      "no rectangle is drawn around the piece on the wall",
      overlay.boxShadow === "none",
      `box-shadow: ${overlay.boxShadow}`,
    );
    record(
      "custom-text",
      "the shadow follows the letters rather than a box",
      /drop-shadow/.test(overlay.imageFilter),
      overlay.imageFilter,
    );
  } catch (err) {
    record("custom-text", "custom-text group completed without throwing", false, String(err).slice(0, 110));
  }
  await context.close();
}

/**
 * Urdu and Arabic in the configurator, all the way to the AR model.
 *
 * Nastaliq is among the hardest scripts to shape and has no working
 * server-side path — Satori, which Next.js uses for images, has no full
 * shaper. The way around it is to let the browser do the shaping, which it does
 * correctly and has already done for the preview: the same canvas that renders
 * the wording feeds the GLB. So these checks are about that chain holding, and
 * about the metrics, since Nastaliq needs roughly twice the line height of a
 * Latin face and clipped its own descenders at the shared value.
 */
async function testUrduAndArabic(browser) {
  const context = await browser.newContext({ viewport: { width: 520, height: 1100 } });
  const page = await context.newPage();
  try {
    await page.goto(`${BASE}/portfolio/sabr`, { waitUntil: "networkidle" });
    await page.locator("[role=tab]", { hasText: /^Make it yours$/ }).click();

    for (const [voice, text, expectFamily] of [
      ["Urdu", "پیاری دیوار", /nastaliq/i],
      ["Arabic", "بسم الله الرحمن الرحيم", /amiri|naskh/i],
    ]) {
      await page.getByRole("button", { name: new RegExp(voice) }).click();
      await page.locator("[role=tabpanel]:not([hidden]) textarea").fill(text);
      await page.waitForTimeout(1200);

      const state = await page.evaluate(async () => {
        await document.fonts.ready;
        const para = document.querySelector("[role=tabpanel]:not([hidden]) p");
        const field = document.querySelector("[role=tabpanel]:not([hidden]) textarea");
        const box = para.parentElement;
        const pr = para.getBoundingClientRect();
        const br = box.getBoundingClientRect();
        const cs = getComputedStyle(para);
        return {
          family: cs.fontFamily,
          fieldDir: field.getAttribute("dir"),
          paraDir: para.getAttribute("dir"),
          lineRatio: parseFloat(cs.lineHeight) / parseFloat(cs.fontSize),
          clipped:
            pr.top < br.top - 1 ||
            pr.bottom > br.bottom + 1 ||
            pr.right > br.right + 1 ||
            pr.left < br.left - 1,
        };
      });

      record("scripts", `${voice} uses its own face, not a fallback`, expectFamily.test(state.family), state.family.slice(0, 60));
      record("scripts", `${voice} sets direction on the field and the preview`, state.fieldDir === "auto" && state.paraDir === "auto", `field=${state.fieldDir} preview=${state.paraDir}`);
      record("scripts", `${voice} text stays inside the preview`, !state.clipped);
      // Latin faces sit at 1.22. An RTL face falling back to that is the bug
      // this catches: Nastaliq clips its own descenders there.
      record("scripts", `${voice} gets more line height than a Latin face`, state.lineRatio > 1.5, `ratio ${state.lineRatio.toFixed(2)}`);
    }

    // The last script typed must reach the 3D model at the piece's real size.
    await page.locator("[role=tab]", { hasText: /^On your wall$/ }).click();
    await page
      .waitForFunction(() => document.querySelector("model-viewer")?.loaded === true, null, {
        timeout: 20000,
      })
      .catch(() => {});
    const model = await page.evaluate(() => {
      const mv = document.querySelector("model-viewer");
      const d = mv?.getDimensions?.();
      return {
        custom: (mv?.src ?? "").startsWith("data:model/gltf-binary"),
        widthM: d ? Number(d.x.toFixed(3)) : null,
        heightM: d ? Number(d.y.toFixed(3)) : null,
      };
    });
    record(
      "scripts",
      "an Arabic-script piece reaches the 3D model at true size",
      Boolean(model.custom) &&
        Math.abs((model.widthM ?? 0) - 0.9) < 0.005 &&
        Math.abs((model.heightM ?? 0) - 1.2) < 0.005,
      `custom=${model.custom} ${model.widthM} x ${model.heightM} m`,
    );
  } catch (err) {
    record("scripts", "urdu and arabic group completed without throwing", false, String(err).slice(0, 110));
  }
  await context.close();
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

  await page.goto(`${BASE}/portfolio/idea-bulb`, { waitUntil: "networkidle" });
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
  const browser = await chromium.launch({
    // The camera preview needs a stream; without these getUserMedia is denied
    // and the group cannot reach what it is testing.
    args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
  });

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

    /**
     * Each group is isolated. A thrown locator timeout in one group used to
     * abort the whole run and discard every result collected before it, which
     * hid what actually passed and made the real failure harder to find.
     */
    const groups = [
      ["artwork page", testArtworkPage],
      ["AR panel", testArPanel],
      ["text configurator", testTextConfigurator],
      ["wall planner", testWallPlanner],
      ["print templates", testPrintTemplates],
      ["portfolio filtering", testPortfolioFiltering],
      ["grid reveals", testGridReveals],
      ["inquiry form", testInquiryForm],
      ["mobile navigation", testMobileNav],
      ["keyboard navigation", testKeyboardNavigation],
      ["dialog focus trap", testDialogFocusTrap],
    ];

    for (const [name, run] of groups) {
      try {
        await run(page, vp);
      } catch (err) {
        record(vp.name, `${name} group completed without throwing`, false, String(err).slice(0, 120));
      }
    }

    record(vp.name, "no console errors during interaction", errors.length === 0, errors.slice(0, 2).join(" | "));
    await context.close();
  }

  await testAndroidArTiers(browser);
  await testArFailureRecovery(browser);
  await testCustomTextReachesPreview(browser);
  await testUrduAndArabic(browser);
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
