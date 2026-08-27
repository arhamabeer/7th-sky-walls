import "server-only";
import { site } from "@/config/site.config";
import {
  TIMELINE_LABELS,
  type InquiryHandover,
  type InquiryInput,
} from "@/lib/inquiry/schema";
import { getVenueById } from "@/lib/content";

/**
 * Delivers an inquiry to the studio.
 *
 * Email goes out through Resend when `RESEND_API_KEY` is configured. Without
 * it — local development, or a deployment before the key is set — the inquiry is
 * logged in full and reported as **not** delivered. The docstring here used to
 * claim the opposite, which is the mistake the caller was written to defend
 * against: reporting success for something that only reached a log file.
 *
 * The log line is complete enough to recover a real inquiry by hand, and
 * `composeHandover` turns the same data into a prefilled WhatsApp or email
 * message so the visitor can complete it themselves in one tap.
 * `assertDeliveryConfigured()` exists so the launch checklist can fail loudly
 * rather than discovering the gap from a customer.
 */

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );

function renderLines(input: InquiryInput): Array<[string, string]> {
  const venue = getVenueById(input.venue)?.name ?? input.venue;
  const lines: Array<[string, string]> = [
    ["Name", input.name],
    ["Email", input.email],
  ];
  if (input.phone) lines.push(["Phone", input.phone]);
  if (input.organisation) lines.push(["Organisation", input.organisation]);
  lines.push(["Kind of space", venue]);
  lines.push(["City", input.city]);
  if (input.wallSize) lines.push(["Wall size", input.wallSize]);
  if (input.timeline) lines.push(["Timeline", TIMELINE_LABELS[input.timeline] ?? input.timeline]);
  if (input.artworkTitle) {
    lines.push([
      "Artwork",
      input.sizeLabel ? `${input.artworkTitle} (${input.sizeLabel})` : input.artworkTitle,
    ]);
  }
  if (input.artworkSlug) {
    lines.push(["Artwork page", `${site.url}/portfolio/${input.artworkSlug}`]);
  }
  return lines;
}

function renderText(input: InquiryInput, reference: string): string {
  const lines = renderLines(input)
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n");
  return `New inquiry (${reference})\n\n${lines}\n\nMessage:\n${input.message}\n`;
}

function renderHtml(input: InquiryInput, reference: string): string {
  const rows = renderLines(input)
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 14px 6px 0;color:#6F675A;font-size:14px;vertical-align:top">${escapeHtml(label)}</td><td style="padding:6px 0;font-size:14px;color:#191510">${escapeHtml(value)}</td></tr>`,
    )
    .join("");

  return `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#191510;max-width:640px">
  <p style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#8F6830;margin:0 0 6px">New inquiry</p>
  <h1 style="font-size:22px;margin:0 0 4px">${escapeHtml(input.name)}</h1>
  <p style="margin:0 0 18px;color:#6F675A;font-size:13px">Reference ${escapeHtml(reference)}</p>
  <table style="border-collapse:collapse;margin-bottom:18px">${rows}</table>
  <div style="border-top:1px solid #E7DFD1;padding-top:14px">
    <p style="margin:0 0 6px;color:#6F675A;font-size:13px">Message</p>
    <p style="margin:0;white-space:pre-wrap;font-size:14px;line-height:1.6">${escapeHtml(input.message)}</p>
  </div>
</div>`;
}

/**
 * Budgets for a prefilled link, measured on the *encoded* length.
 *
 * Measuring the decoded string would be wrong for this site in particular:
 * `encodeURIComponent` turns one Urdu or Arabic character into nine bytes of
 * percent-escapes, so an Urdu message that looks well within budget produces a
 * URL three times over it. Both numbers leave room for the scheme, the address
 * and the encoded subject on top.
 */
const MAILTO_BODY_BUDGET = 1500;
const WHATSAPP_BODY_BUDGET = 3000;

/**
 * Split a string into units that are safe to cut between.
 *
 * Grapheme clusters where the runtime can find them, code points otherwise —
 * never UTF-16 code units. Cutting between code units splits a surrogate pair
 * and leaves a lone surrogate, and `encodeURIComponent` throws `URI malformed` on
 * one of those. That is not theoretical: this clamp did exactly that, inside the
 * binary search, for any message with an emoji near the boundary — measured, a
 * message of "…reception wall 🎉🙏🏽 and the lobby too 🕌" threw at the WhatsApp
 * budget. On the current setup the handover *is* how an inquiry reaches the
 * studio, so that crash was on the one path the whole site funnels into, for a
 * customer typing the way people type on WhatsApp.
 *
 * Graphemes rather than code points because 🙏🏽 is two code points — a hand and a
 * skin tone — and cutting between them silently changes the emoji rather than
 * dropping it.
 */
function splittableUnits(text: string): string[] {
  const Segmenter = (Intl as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  if (Segmenter) {
    return [...new Segmenter(undefined, { granularity: "grapheme" }).segment(text)].map(
      (s) => s.segment,
    );
  }
  return [...text];
}

/** Trim `body` until its encoded form fits, marking it if anything was cut. */
function clampToUrlBudget(body: string, budget: number): { text: string; truncated: boolean } {
  if (encodeURIComponent(body).length <= budget) return { text: body, truncated: false };
  const marker = "\n\n[Message cut short to fit — happy to send the rest.]";
  const units = splittableUnits(body);

  // Binary search on units: the encoded length is not proportional to their
  // count once scripts are mixed, so stepping by bytes would either overshoot or
  // take thousands of iterations.
  let low = 0;
  let high = units.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (encodeURIComponent(units.slice(0, mid).join("") + marker).length <= budget) low = mid;
    else high = mid - 1;
  }

  /**
   * Back off to the last space, so the message ends on a word.
   *
   * Only if a space is reasonably close to the cut — on a run with no spaces
   * there is nothing to back off to, and dropping a quarter of the message to
   * find one would lose more than the ragged edge costs. Urdu and Arabic are the
   * reason this is worth doing at all: a Latin word cut in half still reads as a
   * cut word, while a cut Urdu word can read as a different word.
   */
  const kept = units.slice(0, low).join("");
  const lastSpace = kept.search(/\s+\S*$/);
  const text = lastSpace > kept.length * 0.9 ? kept.slice(0, lastSpace) : kept;

  return { text: text.trimEnd() + marker, truncated: true };
}

/**
 * The same inquiry, composed for a person to send by hand.
 *
 * Built from `renderLines` so it carries exactly the fields the email would —
 * a handover that quietly drops the wall size is a handover that costs the
 * studio a follow-up question.
 */
export function composeHandover(input: InquiryInput, reference: string): InquiryHandover {
  const lines = renderLines(input);
  const body = (omit: string) => {
    const kept = lines
      .filter(([label]) => label !== omit)
      .map(([label, value]) => `${label}: ${value}`)
      .join("\n");
    return `Inquiry ${reference}\n\n${kept}\n\n${input.message}\n`;
  };

  // Each channel already carries one of the two contact handles: WhatsApp shows
  // the sender's number, and an email shows the sender's address. Repeating it
  // in the body only lengthens a URL that has a hard limit.
  const whatsapp = clampToUrlBudget(body("Phone"), WHATSAPP_BODY_BUDGET);
  const email = clampToUrlBudget(body("Email"), MAILTO_BODY_BUDGET);

  return {
    subject: subjectFor(input),
    whatsapp: whatsapp.text,
    email: email.text,
    truncated: whatsapp.truncated || email.truncated,
  };
}

function subjectFor(input: InquiryInput): string {
  return input.artworkTitle
    ? `Inquiry: ${input.artworkTitle} — ${input.name}`
    : `Inquiry from ${input.name} (${input.city})`;
}

/** True when real email delivery is configured. */
export function isDeliveryConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.INQUIRY_FROM_EMAIL);
}

/** For the launch checklist: refuse to go live with inquiries only logged. */
export function assertDeliveryConfigured(): void {
  if (!isDeliveryConfigured()) {
    throw new Error(
      "Inquiry delivery is not configured. Set RESEND_API_KEY and INQUIRY_FROM_EMAIL before launch, " +
        "or inquiries will only be written to the server log.",
    );
  }
}

export async function deliverInquiry(
  input: InquiryInput,
  reference: string,
): Promise<{ delivered: boolean; detail: string }> {
  const subject = subjectFor(input);

  if (!isDeliveryConfigured()) {
    console.info(
      `[inquiry ${reference}] delivery not configured; recording instead\n${renderText(input, reference)}`,
    );
    return { delivered: false, detail: "logged" };
  }

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  const { error } = await resend.emails.send({
    from: process.env.INQUIRY_FROM_EMAIL as string,
    to: process.env.INQUIRY_TO_EMAIL ?? site.contact.email,
    // Replying from the inbox should reach the customer, not the sender domain.
    replyTo: input.email,
    subject,
    text: renderText(input, reference),
    html: renderHtml(input, reference),
  });

  if (error) {
    // Log the full inquiry so a delivery outage never loses a lead.
    console.error(
      `[inquiry ${reference}] delivery failed: ${error.message}\n${renderText(input, reference)}`,
    );
    throw new Error("delivery-failed");
  }

  return { delivered: true, detail: "emailed" };
}
