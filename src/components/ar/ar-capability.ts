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
  /**
   * Android only: Scene Viewer is worth offering as a secondary attempt, but
   * must not be the primary action because it is expected to fail.
   */
  sceneViewerFallback?: boolean;
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
  /** Distinguishes "asked and told no" from "could not ask" — see below. */
  let xrAnswered = false;
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
      xrAnswered = true;
    } catch {
      /* treat a rejection as unsupported, and as no answer */
    }
  }

  if (isAndroid()) {
    /**
     * WebXR and Scene Viewer are both gated on Google Play Services for AR, so
     * a Chrome that exposes navigator.xr and then answers "immersive-ar: no" is
     * telling us ARCore is unavailable — and Scene Viewer will fail the same
     * way.
     *
     * This used to return scene-viewer for every Android on the reasoning that
     * Play Services for AR prompts to install itself when missing. On a handset
     * where the Play Store reports that app "incompatible with this device"
     * there is nothing to install, so the primary button was dead and the only
     * working option was a small link underneath it. Found on a real device,
     * and it is the exact failure this detection exists to prevent.
     *
     * Scene Viewer stays reachable as a clearly-labelled secondary attempt, so
     * a device where this inference is wrong is not shut out of real AR.
     *
     * With navigator.xr absent entirely — an older browser or a WebView — we
     * genuinely cannot tell, and Scene Viewer's own install prompt is a better
     * bet than assuming failure.
     */
    if (!xrAnswered) {
      return {
        tier: "scene-viewer",
        isImmersive: true,
        handsOff: true,
        reason: "Android, WebXR support unknown; Scene Viewer may hand off",
      };
    }
    if (supportsCamera()) {
      return {
        tier: "overlay",
        isImmersive: false,
        handsOff: false,
        sceneViewerFallback: true,
        reason: "Android reports no immersive-ar, so ARCore is unavailable",
      };
    }
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
