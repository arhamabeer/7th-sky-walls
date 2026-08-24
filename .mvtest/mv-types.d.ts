import type React from 'react';
import type { ModelViewerElement } from '@google/model-viewer';

type MVAttrs = {
  src?: string;
  alt?: string;
  poster?: string;
  reveal?: 'auto' | 'manual';
  loading?: 'auto' | 'lazy' | 'eager';
  ar?: boolean;
  'ar-modes'?: string;
  'ar-placement'?: 'floor' | 'wall';
  'ar-scale'?: 'auto' | 'fixed';
  'ios-src'?: string;
  'xr-environment'?: boolean;
  'camera-controls'?: boolean;
  'disable-zoom'?: boolean;
  'touch-action'?: 'pan-y' | 'pan-x' | 'none';
  'shadow-intensity'?: number | string;
  'environment-image'?: string;
  'skybox-image'?: string;
  'min-camera-orbit'?: string;
  'max-camera-orbit'?: string;
  ref?: React.Ref<ModelViewerElement>;
};

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>, HTMLElement
      > & MVAttrs;
    }
  }
}
