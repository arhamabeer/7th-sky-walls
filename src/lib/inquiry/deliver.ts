import "server-only";
import { site } from "@/config/site.config";
import { TIMELINE_LABELS, type InquiryInput } from "@/lib/inquiry/schema";
import { getVenueById } from "@/lib/content";

/**
 * Delivers an inquiry to the studio.
 *
 * Email goes out through Resend when `RESEND_API_KEY` is configured. Without
 * it — local development, or a deployment before the key is set — the inquiry
 * is logged in full and reported as delivered.
 *
 * That fallback is deliberate but narrow: it keeps the form testable end to
 * end without credentials, and the log line is complete enough to recover a
 * real inquiry by hand. `assertDeliveryConfigured()` exists so the launch
 * checklist can fail loudly rather than discovering the gap from a customer.
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
  const subject = input.artworkTitle
    ? `Inquiry: ${input.artworkTitle} — ${input.name}`
    : `Inquiry from ${input.name} (${input.city})`;

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
