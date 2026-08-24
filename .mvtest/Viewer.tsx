'use client';
import { useEffect, useRef, useState } from 'react';
import type { ModelViewerElement } from '@google/model-viewer';

export default function Viewer({ glb, usdz }: { glb: string; usdz: string }) {
  const ref = useRef<ModelViewerElement>(null);
  const [ready, setReady] = useState(false);
  const [arOk, setArOk] = useState(false);

  useEffect(() => {
    let alive = true;
    import('@google/model-viewer').then(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !ready) return;
    const onStatus = (e: Event) => {
      const d = (e as CustomEvent<{ status: string }>).detail;
      if (d.status === 'failed') setArOk(false);
    };
    el.addEventListener('ar-status', onStatus);
    el.updateComplete.then(() => setArOk(el.canActivateAR));
    return () => el.removeEventListener('ar-status', onStatus);
  }, [ready]);

  if (!ready) return null;
  return (
    <model-viewer
      ref={ref}
      src={glb}
      ios-src={usdz}
      ar
      ar-modes="webxr scene-viewer quick-look"
      ar-placement="wall"
      ar-scale="fixed"
      camera-controls
      touch-action="pan-y"
      shadow-intensity={1}
      environment-image="neutral"
      poster="/poster.webp"
      reveal="auto"
      loading="lazy"
      alt="Framed artwork"
      style={{ width: '100%', height: '480px' }}
    >
      <button slot="ar-button">View on my wall {arOk ? '' : ''}</button>
    </model-viewer>
  );
}
