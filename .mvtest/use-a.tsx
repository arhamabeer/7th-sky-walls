export function A() {
  return <model-viewer src="/a.glb" ar ar-modes="webxr scene-viewer quick-look" ar-placement="wall" ar-scale="fixed" />;
}
export function Bad() {
  return <model-viewer ar-placement="ceiling" />;
}
