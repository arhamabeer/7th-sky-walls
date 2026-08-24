declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': { src?: string; ar?: boolean };
    }
  }
}
export {};
