"use server";

import { headers } from "next/headers";
import { inquirySchema, type InquiryResult } from "@/lib/inquiry/schema";
import { checkRateLimit } from "@/lib/inquiry/rate-limit";
import { deliverInquiry } from "@/lib/inquiry/deliver";

/**
 * Handles an inquiry submission.
 *
 * Validation runs here as well as in the browser: client-side checks are for
 * the person filling the form, not for trusting what arrives.
 */
export async function submitInquiry(
  _previous: InquiryResult | null,
  formData: FormData,
): Promise<InquiryResult> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = inquirySchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return {
      status: "error",
      message: "Please check the highlighted fields.",
      fieldErrors,
    };
  }

  const input = parsed.data;

  /**
   * Honeypot. Report success rather than rejection: a bot that learns it was
   * caught adapts, and a person can never see this field to fill it.
   */
  if (input.website) {
    return { status: "ok", reference: "—" };
  }

  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerList.get("x-real-ip") ??
    "unknown";

  const limit = checkRateLimit(ip);
  if (!limit.allowed) {
    const minutes = Math.max(1, Math.ceil(limit.retryAfterMs / 60000));
    return {
      status: "error",
      message: `That's several inquiries in a short time. Please try again in about ${minutes} minute${minutes === 1 ? "" : "s"}, or message us on WhatsApp.`,
    };
  }

  // Short, human-readable reference so a follow-up email can cite it.
  const reference = `INQ-${Date.now().toString(36).toUpperCase().slice(-6)}`;

  try {
    const { delivered } = await deliverInquiry(input, reference);

    /**
     * Never report success for an inquiry that was only written to a log.
     *
     * Without RESEND_API_KEY and INQUIRY_FROM_EMAIL, `deliverInquiry` records
     * the submission to the server log and returns `delivered: false`. That
     * result used to be discarded, so the form told the visitor it had been
     * sent — the worst possible failure for the one action this whole site
     * exists to produce. A form that silently swallows an inquiry is worse than
     * no form, because the visitor stops trying.
     *
     * Development still reports success: the log is how the form is tested, and
     * a developer can see it. Anywhere else, say plainly that it did not send
     * and point at the two channels that work without any configuration.
     */
    if (!delivered && process.env.NODE_ENV === "production") {
      return {
        status: "error",
        message:
          "Sorry — our inquiry email is not connected yet, so that did not reach us. Please send it on WhatsApp or by email instead and we will reply the same way.",
      };
    }

    return { status: "ok", reference };
  } catch {
    return {
      status: "error",
      message:
        "We could not send that just now. Please try again, or reach us on WhatsApp — we will see it either way.",
    };
  }
}
