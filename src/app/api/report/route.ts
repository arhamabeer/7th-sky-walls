import { headers } from "next/headers";
import { checkRateLimit } from "@/lib/inquiry/rate-limit";

/**
 * Client error sink.
 *
 * The error boundaries log a failure and its digest, but a browser console is
 * not somewhere anyone can read: a visitor whose AR panel or configurator threw
 * is invisible unless they happen to mention it. This forwards the failure to
 * the server, where it lands in Vercel's runtime logs alongside everything
 * else.
 *
 * Deliberately not a third-party service. That was the studio's call: no paid
 * dependency and no external processor of visitor data, at the cost of
 * grouping, alerting and de-minified stack traces. The boundaries are the hook
 * point either way, so swapping this for a service later is a small change.
 *
 * What it does NOT collect, on purpose: no cookies, no form contents, no
 * identifiers. Only what is needed to find the bug — where it happened, what
 * threw, and the digest that ties a browser report to the server-side render
 * that produced it.
 */

/** Bound every field, so a malformed or hostile body cannot fill the log. */
const LIMITS = { boundary: 40, digest: 64, message: 300, url: 300, stack: 1200 };

const clip = (value: unknown, max: number): string =>
  typeof value === "string" ? value.slice(0, max) : "";

export async function POST(request: Request) {
  const head = await headers();
  const ip =
    head.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    head.get("x-real-ip") ||
    "unknown";

  // Same limiter the inquiry form uses. An error loop in one browser must not
  // be able to fill the log, and this endpoint is unauthenticated.
  if (!checkRateLimit(`report:${ip}`).allowed) {
    return new Response(null, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return new Response(null, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const report = {
    boundary: clip(payload.boundary, LIMITS.boundary) || "unknown",
    digest: clip(payload.digest, LIMITS.digest),
    message: clip(payload.message, LIMITS.message),
    url: clip(payload.url, LIMITS.url),
    stack: clip(payload.stack, LIMITS.stack),
    userAgent: clip(head.get("user-agent"), 200),
  };

  console.error(
    `[client-error] boundary=${report.boundary} digest=${report.digest || "none"} ` +
      `url=${report.url}\n  ${report.message}\n  ua=${report.userAgent}` +
      (report.stack ? `\n  ${report.stack}` : ""),
  );

  // 204: the page has already shown the visitor what happened, and there is
  // nothing useful to hand back. Reporting must never itself become an error.
  return new Response(null, { status: 204 });
}
