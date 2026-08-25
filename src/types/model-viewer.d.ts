import type { DetailedHTMLProps, HTMLAttributes } from "react";

/**
 * Type declaration for Google's <model-viewer> custom element.
 *
 * React 19 passes unknown attributes through to custom elements as-is, so the
 * element only needs describing to TypeScript, not wrapping.
 */
export interface ModelViewerElement extends HTMLElement {
  /** True once the element knows AR can actually be launched on this device. */
  readonly canActivateAR: boolean;
  activateAR(): Promise<void>;
  readonly loaded: boolean;
  readonly modelIsVisible: boolean;
}

/** Detail payload of the `ar-status` event. */
export type ArStatus =
  | "not-presenting"
  | "session-started"
  | "object-placed"
  | "failed";

declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        "model-viewer": DetailedHTMLProps<
          HTMLAttributes<ModelViewerElement> & {
            src?: string;
            "ios-src"?: string;
            alt?: string;
            poster?: string;
            ar?: boolean | "";
            "ar-modes"?: string;
            "ar-placement"?: "floor" | "wall";
            "ar-scale"?: "auto" | "fixed";
            "camera-controls"?: boolean | "";
            "disable-zoom"?: boolean | "";
            "disable-pan"?: boolean | "";
            "touch-action"?: string;
            "shadow-intensity"?: string | number;
            "shadow-softness"?: string | number;
            exposure?: string | number;
            "environment-image"?: string;
            reveal?: "auto" | "interaction" | "manual";
            loading?: "auto" | "lazy" | "eager";
            "camera-orbit"?: string;
            "min-camera-orbit"?: string;
            "max-camera-orbit"?: string;
            "field-of-view"?: string;
            "interaction-prompt"?: "auto" | "none";
            autoplay?: boolean | "";
          },
          ModelViewerElement
        >;
      }
    }
  }
}
