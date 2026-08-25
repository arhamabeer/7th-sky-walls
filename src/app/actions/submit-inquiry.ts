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
    await deliverInquiry(input, reference);
    return { status: "ok", reference };
  } catch {
    return {
      status: "error",
      message:
        "We could not send that just now. Please try again, or reach us on WhatsApp — we will see it either way.",
    };
  }
}
