"use client";

import { useEffect, useState } from "react";
import { detectArCapability, type ArCapability } from "@/components/ar/ar-capability";

interface Facts {
  userAgent: string;
  secureContext: boolean;
  hasNavigatorXr: boolean;
  hasIsSessionSupported: boolean;
  immersiveAr: string;
  immersiveVr: string;
  hasGetUserMedia: boolean;
  maxTouchPoints: number;
  platform: string;
  chromeVersion: string;
  modelViewerLoaded: boolean;
  canActivateAR: string;
  capability: ArCapability | null;
}

/**
 * Reads every signal the AR tiering branches on, and reports them raw.
 *
 * `immersive-ar` is the important one, and the distinction that matters is
 * three-way, not two: navigator.xr missing entirely, present and answering no,
 * or present and answering yes. The middle and the first look identical from a
 * user-agent string and lead to opposite correct behaviour.
 */
export function ArDiagnostic() {
  const [facts, setFacts] = useState<Facts | null>(null);

  useEffect(() => {
    let cancelled = false;

    const gather = async () => {
      const nav = navigator as Navigator & {
        xr?: { isSessionSupported?: (mode: string) => Promise<boolean> };
      };

      const probe = async (mode: string): Promise<string> => {
        if (!nav.xr?.isSessionSupported) return "navigator.xr absent";
        try {
          return String(await nav.xr.isSessionSupported(mode));
        } catch (err) {
          return `threw: ${(err as Error)?.name ?? "unknown"}`;
        }
      };

      const immersiveAr = await probe("immersive-ar");
      const immersiveVr = await probe("immersive-vr");

      // Load model-viewer the same way the panel does, so canActivateAR is the
      // real answer rather than a guess about it.
      let modelViewerLoaded = false;
      let canActivateAR = "not checked";
      try {
        await import("@google/model-viewer");
        modelViewerLoaded = true;
        const el = document.createElement("model-viewer") as HTMLElement & {
          canActivateAR?: boolean;
        };
        el.setAttribute("ar", "");
        el.setAttribute("ar-modes", "webxr scene-viewer quick-look");
        el.setAttribute("src", "/ar/sabr/l.glb");
        el.setAttribute("ios-src", "/ar/sabr/l.usdz");
        el.style.position = "absolute";
        el.style.width = "1px";
        el.style.height = "1px";
        el.style.opacity = "0";
        document.body.appendChild(el);
        await new Promise((r) => setTimeout(r, 1200));
        canActivateAR = String(el.canActivateAR);
        el.remove();
      } catch (err) {
        canActivateAR = `error: ${(err as Error)?.message?.slice(0, 60) ?? "unknown"}`;
      }

      const capability = await detectArCapability();
      const chrome = /Chrome\/(\d+)/.exec(navigator.userAgent)?.[1] ?? "not Chrome";

      if (cancelled) return;
      setFacts({
        userAgent: navigator.userAgent,
        secureContext: window.isSecureContext,
        hasNavigatorXr: "xr" in navigator,
        hasIsSessionSupported: typeof nav.xr?.isSessionSupported === "function",
        immersiveAr,
        immersiveVr,
        hasGetUserMedia: Boolean(navigator.mediaDevices?.getUserMedia),
        maxTouchPoints: navigator.maxTouchPoints,
        platform: (navigator as Navigator & { platform?: string }).platform ?? "unknown",
        chromeVersion: chrome,
        modelViewerLoaded,
        canActivateAR,
        capability,
      });
    };

    void gather();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!facts) {
    return (
      <p className="mt-8 text-sm text-muted">
        Asking the device… this takes a couple of seconds because it loads the 3D
        viewer to read its real answer.
      </p>
    );
  }

  const rows: Array<[string, string]> = [
    ["Resolved tier", facts.capability?.tier ?? "none"],
    ["Reason", facts.capability?.reason ?? "—"],
    ["Scene Viewer offered as fallback", String(Boolean(facts.capability?.sceneViewerFallback))],
    ["navigator.xr exists", String(facts.hasNavigatorXr)],
    ["xr.isSessionSupported exists", String(facts.hasIsSessionSupported)],
    ["immersive-ar supported", facts.immersiveAr],
    ["immersive-vr supported", facts.immersiveVr],
    ["model-viewer canActivateAR", facts.canActivateAR],
    ["model-viewer loaded", String(facts.modelViewerLoaded)],
    ["Camera available", String(facts.hasGetUserMedia)],
    ["Secure context (https)", String(facts.secureContext)],
    ["Chrome version", facts.chromeVersion],
    ["Platform", facts.platform],
    ["Max touch points", String(facts.maxTouchPoints)],
  ];

  return (
    <div className="mt-8">
      <dl className="divide-y divide-line rounded-xl border border-line bg-surface">
        {rows.map(([label, value]) => (
          <div key={label} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 p-3">
            <dt className="min-w-0 flex-1 text-sm text-muted">{label}</dt>
            <dd className="font-mono text-sm font-semibold break-all">{value}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-4 text-xs leading-5 text-muted">User agent</p>
      <p className="mt-1 rounded-lg border border-line bg-surface p-3 font-mono text-xs break-all">
        {facts.userAgent}
      </p>
    </div>
  );
}
