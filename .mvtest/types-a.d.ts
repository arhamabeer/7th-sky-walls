import type React from 'react';
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        ar?: boolean;
        'ar-modes'?: string;
        'ar-placement'?: 'floor' | 'wall';
        'ar-scale'?: 'auto' | 'fixed';
      };
    }
  }
}
