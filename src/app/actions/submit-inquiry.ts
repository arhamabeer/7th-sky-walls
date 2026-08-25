"use server";

import { headers } from "next/headers";
import {
  inquirySchema,
  type InquiryResult,
  type InquiryValues,
} from "@/lib/inquiry/schema";
import { checkRateLimit } from "@/lib/inquiry/rate-limit";
import { composeHandover, deliverInquiry } from "@/lib/inquiry/deliver";

/**
 * Handles an inquiry submission.
 *
 * Validation runs here as well as in the browser: client-side checks are for
 * the person filling the form, not for trusting what arrives.
 *
 * Every failure of a *valid* submission comes back with a handover — the same
 * inquiry composed into a prefilled WhatsApp or email message. Validation errors
 * do not get one, because there the right move is to fix the field. The
 * distinction matters: an undeliverable inquiry is the last step of the only
 * action this site exists to produce, and leaving someone to find WhatsApp and
 * retype everything they just wrote is where a lead is actually lost.
 */
/**
 * The fields to hand back so the form can re-seed itself.
 *
 * Read from the raw submission rather than the parsed data, because a validation
 * error is exactly the case where the parse failed and the invalid value is the
 * one the visitor needs to see and correct. Capped in length: the schema's limits
 * are what the browser was asked to enforce, not what has to arrive.
 */
const ECHOED: Array<keyof InquiryValues> = [
  "name",
  "email",
  "phone",
  "organisation",
  "venue",
  "city",
  "wallSize",
  "timeline",
  "message",
];

function echoValues(raw: Record<string, unknown>): InquiryValues {
  const out: InquiryValues = {};
  for (const key of ECHOED) {
    const value = raw[key];
    if (typeof value === "string" && value !== "") out[key] = value.slice(0, 4000);
  }
  return out;
}

export async function submitInquiry(
  _previous: InquiryResult | null,
  formData: FormData,
): Promise<InquiryResult> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = inquirySchema.safeParse(raw);
  const values = echoValues(raw);
  // Unique per submission, so the form remounts its fields even when the same
  // error repeats.
  const token = Date.now().toString(36);

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
      values,
      token,
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
      message: `That's several inquiries in a short time. Please try again in about ${minutes} minute${minutes === 1 ? "" : "s"} — or send this one straight through below, which is not rate limited.`,
      handover: composeHandover(input, `INQ-${token.toUpperCase().slice(-6)}`),
      values,
      token,
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
          "Sorry — our inquiry email is not connected yet, so that did not reach us. Nothing you typed is lost: send it straight through below and we will reply the same way.",
        handover: composeHandover(input, reference),
        values,
        token,
      };
    }

    return { status: "ok", reference };
  } catch {
    return {
      status: "error",
      message:
        "We could not send that just now. Try again, or send it straight through below — nothing you typed is lost.",
      handover: composeHandover(input, reference),
      values,
      token,
    };
  }
}
