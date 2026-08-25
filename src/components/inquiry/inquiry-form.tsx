"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { submitInquiry } from "@/app/actions/submit-inquiry";
import type { InquiryResult } from "@/lib/inquiry/schema";
import { TIMELINE_LABELS } from "@/lib/inquiry/schema";
import { whatsappLink } from "@/config/site.config";
import { cn } from "@/lib/utils";

interface VenueOption {
  id: string;
  name: string;
}

/**
 * The inquiry form.
 *
 * Built on a server action with `useActionState`, so it submits and reports
 * errors without JavaScript too — the fields, the required rules and the
 * server-side validation all work from plain HTML. Progressive enhancement
 * matters more than usual here: this is the only path to a sale on the site.
 *
 * Fields are ordered to qualify a commercial lead in one pass — the kind of
 * space, the city, the wall and the timeline — so a reply can quote rather
 * than ask four more questions.
 */
export function InquiryForm({
  venues,
  artworkSlug,
  artworkTitle,
  sizeLabel,
  configuration,
  whatsappMessage,
}: {
  venues: VenueOption[];
  artworkSlug?: string;
  artworkTitle?: string;
  sizeLabel?: string;
  /** A sentence describing choices already made in the configurator. */
  configuration?: string;
  whatsappMessage: string;
}) {
  const [result, action, pending] = useActionState<InquiryResult | null, FormData>(
    submitInquiry,
    null,
  );
  const formId = useId();
  const statusRef = useRef<HTMLDivElement>(null);

  // Move attention to the outcome, whichever way it went.
  useEffect(() => {
    if (result) statusRef.current?.focus();
  }, [result]);

  const fieldError = (name: string) =>
    result?.status === "error" ? result.fieldErrors?.[name] : undefined;

  const inputClass = (name: string) =>
    cn(
      "mt-1.5 block min-h-12 w-full rounded-lg border bg-background px-4 py-3 text-base",
      // No outline-none here. The global :focus-visible outline is the site's
      // focus indicator at 4.69:1; the accent/40 ring it used to be replaced
      // with measured 1.73:1, under the 3:1 that WCAG 2.2 asks of an indicator,
      // so fields looked focused to nobody who needed the cue.
      "focus:border-ink",
      fieldError(name) ? "border-accent" : "border-line",
    );

  const labelClass = "block text-sm font-medium";
  const errorClass = "mt-1 text-sm text-accent";

  if (result?.status === "ok") {
    return (
      <div
        ref={statusRef}
        tabIndex={-1}
        role="status"
        className="rounded-xl border border-line bg-surface p-6 focus:outline-none sm:p-8"
      >
        <h2 className="font-display text-2xl font-medium">
          Thank you &mdash; that&apos;s with us.
        </h2>
        <p className="mt-3 text-base leading-7 text-muted">
          We reply within one working day. Your reference is{" "}
          <span className="font-medium text-ink">{result.reference}</span>.
        </p>
        <p className="mt-4 text-sm leading-6 text-muted">
          If it&apos;s urgent,{" "}
          <a
            href={whatsappLink(whatsappMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center font-semibold text-accent underline underline-offset-4"
          >
            message us on WhatsApp
          </a>{" "}
          and we&apos;ll pick it up sooner.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5" noValidate>
      {/* Context carried from an artwork page, so the studio knows what prompted the inquiry. */}
      {artworkSlug && <input type="hidden" name="artworkSlug" value={artworkSlug} />}
      {artworkTitle && <input type="hidden" name="artworkTitle" value={artworkTitle} />}
      {sizeLabel && <input type="hidden" name="sizeLabel" value={sizeLabel} />}

      {/* Honeypot: hidden from people, tempting to naive bots. */}
      <div aria-hidden className="absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden">
        <label htmlFor={`${formId}-website`}>Website</label>
        <input id={`${formId}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {result?.status === "error" && (
        <div
          ref={statusRef}
          tabIndex={-1}
          role="alert"
          className="rounded-lg border border-accent/50 bg-accent/10 p-4 text-sm leading-6 focus:outline-none"
        >
          {result.message}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor={`${formId}-name`} className={labelClass}>
            Your name <span className="text-accent">*</span>
          </label>
          <input
            id={`${formId}-name`}
            name="name"
            required
            autoComplete="name"
            aria-invalid={Boolean(fieldError("name"))}
            aria-describedby={fieldError("name") ? `${formId}-name-error` : undefined}
            className={inputClass("name")}
          />
          {fieldError("name") && (
            <p id={`${formId}-name-error`} className={errorClass}>
              {fieldError("name")}
            </p>
          )}
        </div>

        <div>
          <label htmlFor={`${formId}-organisation`} className={labelClass}>
            Organisation
          </label>
          <input
            id={`${formId}-organisation`}
            name="organisation"
            autoComplete="organization"
            className={inputClass("organisation")}
          />
        </div>

        <div>
          <label htmlFor={`${formId}-email`} className={labelClass}>
            Email <span className="text-accent">*</span>
          </label>
          <input
            id={`${formId}-email`}
            name="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            aria-invalid={Boolean(fieldError("email"))}
            aria-describedby={fieldError("email") ? `${formId}-email-error` : undefined}
            className={inputClass("email")}
          />
          {fieldError("email") && (
            <p id={`${formId}-email-error`} className={errorClass}>
              {fieldError("email")}
            </p>
          )}
        </div>

        <div>
          <label htmlFor={`${formId}-phone`} className={labelClass}>
            Phone or WhatsApp
          </label>
          <input
            id={`${formId}-phone`}
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            className={inputClass("phone")}
          />
        </div>

        <div>
          <label htmlFor={`${formId}-venue`} className={labelClass}>
            Kind of space <span className="text-accent">*</span>
          </label>
          <select
            id={`${formId}-venue`}
            name="venue"
            required
            defaultValue=""
            aria-invalid={Boolean(fieldError("venue"))}
            className={inputClass("venue")}
          >
            <option value="" disabled>
              Choose one
            </option>
            {venues.map((venue) => (
              <option key={venue.id} value={venue.id}>
                {venue.name}
              </option>
            ))}
          </select>
          {fieldError("venue") && <p className={errorClass}>{fieldError("venue")}</p>}
        </div>

        <div>
          <label htmlFor={`${formId}-city`} className={labelClass}>
            City <span className="text-accent">*</span>
          </label>
          <input
            id={`${formId}-city`}
            name="city"
            required
            autoComplete="address-level2"
            aria-invalid={Boolean(fieldError("city"))}
            className={inputClass("city")}
          />
          {fieldError("city") && <p className={errorClass}>{fieldError("city")}</p>}
        </div>

        <div>
          <label htmlFor={`${formId}-wallSize`} className={labelClass}>
            Wall size
          </label>
          <input
            id={`${formId}-wallSize`}
            name="wallSize"
            placeholder="Roughly — “about 3m wide” is fine"
            className={inputClass("wallSize")}
          />
        </div>

        <div>
          <label htmlFor={`${formId}-timeline`} className={labelClass}>
            Timeline
          </label>
          <select
            id={`${formId}-timeline`}
            name="timeline"
            defaultValue=""
            className={inputClass("timeline")}
          >
            <option value="">No fixed date</option>
            {Object.entries(TIMELINE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor={`${formId}-message`} className={labelClass}>
          About the space <span className="text-accent">*</span>
        </label>
        <textarea
          id={`${formId}-message`}
          name="message"
          rows={5}
          required
          defaultValue={
            configuration
              ? `${configuration}\n\n`
              : artworkTitle
                ? `I'm interested in ${artworkTitle}${sizeLabel ? ` at ${sizeLabel}` : ""}. `
                : ""
          }
          placeholder="What's the room, what's on the wall now, and what feeling are you after?"
          aria-invalid={Boolean(fieldError("message"))}
          className={cn(inputClass("message"), "min-h-32 resize-y leading-7")}
        />
        {fieldError("message") && <p className={errorClass}>{fieldError("message")}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-12 items-center justify-center rounded-full bg-ink px-7 text-sm font-semibold text-background transition-opacity hover:opacity-85 disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send inquiry"}
        </button>
        <p className="text-sm text-muted">
          Or{" "}
          <a
            href={whatsappLink(whatsappMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center font-semibold text-accent underline underline-offset-4"
          >
            message us on WhatsApp
          </a>
          .
        </p>
      </div>

      <p className="text-xs leading-5 text-muted">
        We use your details only to answer this inquiry.
      </p>
    </form>
  );
}
