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

export type InquiryResult =
  | { status: "ok"; reference: string }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };
