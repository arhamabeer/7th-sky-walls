import { z } from "zod";
import { VENUE_IDS } from "@/lib/content/schema";

/**
 * Inquiry shape, shared by the form and the server action so the browser and
 * the server can never disagree about what is valid.
 *
 * The fields are chosen to qualify a commercial lead in one pass: what kind of
 * space, where, how big the wall is and when it is needed. Answering those up
 * front is the difference between a reply that quotes and a reply that asks
 * four more questions.
 */
export const inquirySchema = z.object({
  name: z.string().trim().min(2, "Please tell us your name").max(120),
  email: z.string().trim().email("Please enter a valid email address").max(200),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  organisation: z.string().trim().max(160).optional().or(z.literal("")),

  venue: z.enum(VENUE_IDS, { message: "Please choose the kind of space" }),
  city: z.string().trim().min(2, "Which city is the space in?").max(120),

  /** Free text, because most people know their wall as "about 3 metres". */
  wallSize: z.string().trim().max(160).optional().or(z.literal("")),
  timeline: z
    .enum(["asap", "1-3-months", "3-6-months", "planning"])
    .optional()
    .or(z.literal("")),

  message: z.string().trim().min(10, "A sentence or two is plenty").max(4000),

  /** Populated by the page when an inquiry starts from a specific piece. */
  artworkSlug: z.string().max(120).optional().or(z.literal("")),
  artworkTitle: z.string().max(200).optional().or(z.literal("")),
  sizeLabel: z.string().max(80).optional().or(z.literal("")),

  /**
   * Honeypot. Hidden from people, irresistible to naive bots. Any value means
   * the submission is discarded — silently, so a bot learns nothing.
   */
  website: z.string().max(200).optional().or(z.literal("")),
});

export type InquiryInput = z.infer<typeof inquirySchema>;

export const TIMELINE_LABELS: Record<string, string> = {
  asap: "As soon as possible",
  "1-3-months": "In the next 1–3 months",
  "3-6-months": "In 3–6 months",
  planning: "Still planning",
};

/**
 * Everything needed to send the same inquiry by hand, composed from what the
 * visitor already typed.
 *
 * Returned with the errors where the submission was valid but did not reach the
 * studio. Telling someone their inquiry failed and leaving them to find WhatsApp
 * and retype it is how a lead is lost at the last step, on the one action this
 * whole site exists to produce.
 */
export interface InquiryHandover {
  subject: string;
  /** Prefilled body for wa.me. Omits the phone number WhatsApp already carries. */
  whatsapp: string;
  /** Prefilled body for mailto. Omits the address the From header already carries. */
  email: string;
  /** True when a long message had to be cut to fit a URL, so the form can say so. */
  truncated: boolean;
}

/**
 * The fields echoed back after a failed submission.
 *
 * React resets an uncontrolled form once its action completes — including when
 * the action returns an error. So without this, a visitor who mistyped one field
 * lost everything they had written, on the only path to a sale on the site. The
 * server sends the raw values back and the form re-seeds itself from them.
 *
 * The honeypot is deliberately absent: echoing it back would fill it in for the
 * next submission and reject a real person's second attempt.
 */
export type InquiryValues = Partial<
  Record<
    | "name"
    | "email"
    | "phone"
    | "organisation"
    | "venue"
    | "city"
    | "wallSize"
    | "timeline"
    | "message",
    string
  >
>;

export type InquiryResult =
  | { status: "ok"; reference: string }
  | {
      status: "error";
      message: string;
      fieldErrors?: Record<string, string>;
      handover?: InquiryHandover;
      values?: InquiryValues;
      /**
       * Changes on every submission, so the form can key its fields on it and
       * remount them with the echoed values. A stable key would leave two
       * consecutive identical errors showing an empty form, because changing
       * defaultValue does not touch an already-mounted input.
       */
      token?: string;
    };
