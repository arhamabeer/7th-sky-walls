/**
 * Which AR path, if any, this device can actually take.
 *
 * The site promises never to show a dead AR button, so capability is resolved
 * before anything is offered rather than discovered when a tap fails.
 *
 * Three tiers, in the order they are attempted:
 *
 *  - `webxr`     Android Chrome and Samsung Internet. In-page session with
 *                hit-testing, no handoff.
 *  - `quick-look` iOS Safari and other WebKit browsers on iPhone/iPad. Apple's
 *                native viewer opens over the page; the artwork's USDZ carries
 *                the wall anchoring.
 *  - `scene-viewer` Android devices without WebXR but with Google Play
 *                Services for AR.
 *
 * Anything else falls through to the in-page camera overlay, which is the
 * universal tier and needs no AR support at all.
 */
export type ArTier = "webxr" | "quick-look" | "scene-viewer" | "overlay" | "none";

export interface ArCapability {
  tier: ArTier;
  /** True when a real AR session is possible, as opposed to the fallback. */
  isImmersive: boolean;
  /** True when the experience leaves the page and returns. */
  handsOff: boolean;
  reason: string;
}

/**
 * iOS reports itself in enough different ways that the reliable signal is the
 * combination of a touch-capable Mac user agent (iPad on recent iPadOS) or an
 * explicit iOS device string.
 */
function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPadOS 13+ presents as a Mac; touch points distinguish it.
  return /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
}

function isAndroid(): boolean {
  return typeof navigator !== "undefined" && /Android/.test(navigator.userAgent);
}

function supportsCamera(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function" &&
    // getUserMedia is only exposed in a secure context, but check anyway so
    // local http testing reports honestly rather than failing at the prompt.
    (typeof window === "undefined" || window.isSecureContext)
  );
}

/**
 * Resolves the best available tier.
 *
 * iOS is deliberately not probed for WebXR: Safari has never supported
 * handheld immersive-ar, and every browser on iOS is WebKit underneath, so
 * Quick Look is the ceiling there.
 */
export async function detectArCapability(): Promise<ArCapability> {
  if (typeof window === "undefined") {
    return { tier: "none", isImmersive: false, handsOff: false, reason: "server" };
  }

  if (isIos()) {
    // Quick Look availability is inferred from the platform; there is no
    // feature test for it, and a link to a USDZ simply does nothing where it
    // is absent. The overlay remains reachable from the same UI regardless.
    return {
      tier: "quick-look",
      isImmersive: true,
      handsOff: true,
      reason: "iOS opens AR Quick Look",
    };
  }

  const xr = (navigator as Navigator & { xr?: { isSessionSupported(mode: string): Promise<boolean> } }).xr;
  if (xr?.isSessionSupported) {
    try {
      if (await xr.isSessionSupported("immersive-ar")) {
        return {
          tier: "webxr",
          isImmersive: true,
          handsOff: false,
          reason: "WebXR immersive-ar is supported",
        };
      }
    } catch {
      /* treat a rejection as unsupported */
    }
  }

  if (isAndroid()) {
    // Scene Viewer ships with Google Play Services for AR, which prompts to
    // install itself when missing, so offering it on Android is reasonable
    // even without a feature test.
    return {
      tier: "scene-viewer",
      isImmersive: true,
      handsOff: true,
      reason: "Android can hand off to Scene Viewer",
    };
  }

  if (supportsCamera()) {
    return {
      tier: "overlay",
      isImmersive: false,
      handsOff: false,
      reason: "no AR runtime; camera overlay available",
    };
  }

  return {
    tier: "none",
    isImmersive: false,
    handsOff: false,
    reason: "no AR runtime and no camera",
  };
}
