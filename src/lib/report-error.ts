/**
 * Send a client-side failure to the internal error sink.
 *
 * Called from the three error boundaries. Never throws and never awaits into
 * the render path: a reporting failure must not become a second error on a page
 * that is already showing one. `keepalive` matters because the most interesting
 * failures are the ones where the visitor immediately leaves.
 */
export function reportError(
  boundary: string,
  error: Error & { digest?: string },
): void {
  if (typeof window === "undefined") return;
  try {
    const body = JSON.stringify({
      boundary,
      digest: error.digest ?? "",
      message: String(error.message ?? error),
      url: window.location.pathname + window.location.search,
      stack: error.stack ?? "",
    });
    void fetch("/api/report", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* reporting is best-effort by design */
  }
}
