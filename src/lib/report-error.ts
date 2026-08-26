/**
 * Send a client-side failure to the internal error sink.
 *
 * Called from the three error boundaries. Never throws and never awaits into
 * the render path: a reporting failure must not become a second error on a page
 * that is already showing one. `keepalive` matters because the most interesting
 * failures are the ones where the visitor immediately leaves.
 */
/**
 * The path plus the *names* of any query parameters, and none of their values.
 *
 * The whole search string used to go into the report, which quietly broke this
 * module's own promise to collect no form contents: a configurator link carries
 * the visitor's own wording in `?text=`, and an inquiry link carries their
 * configuration. The names are what the diagnosis actually needs — "this throws
 * when `text` is present" — and the values add nothing a stack trace does not.
 */
function reportableUrl(): string {
  const keys = [...new URLSearchParams(window.location.search).keys()].sort();
  return keys.length
    ? `${window.location.pathname}?${keys.join("&")}`
    : window.location.pathname;
}

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
      url: reportableUrl(),
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
