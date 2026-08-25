/**
 * Cumulative delay for staggered sibling reveals, capped so long grids never
 * leave the last item waiting seconds to appear.
 *
 * Kept out of the client-component module so Server Components can call it
 * while mapping over content — anything exported from a "use client" file
 * becomes a client reference and is not callable on the server.
 */
export function staggerDelay(index: number, step = 0.06, max = 0.36): number {
  return Math.min(index * step, max);
}
