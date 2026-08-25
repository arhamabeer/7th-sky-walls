/**
 * Reading-progress bar, driven entirely by CSS.
 *
 * This was previously a client component using a spring and a scroll
 * subscription, which pulled the animation library into the bundle of every
 * page for one decorative line. A CSS scroll-driven animation runs on the
 * compositor, costs no JavaScript at all, and cannot contribute to input
 * delay.
 *
 * Where `animation-timeline` is unsupported the bar simply never appears —
 * see globals.css, where it is drawn only inside an @supports block. It is
 * decorative, so nothing is lost.
 */
export function ScrollProgress() {
  return <div aria-hidden data-site-chrome className="scroll-progress" />;
}
