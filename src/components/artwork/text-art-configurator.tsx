"use client";

import { useId, useMemo, useState } from "react";
import { MOUNTS, getMount, mountShadow } from "@/content/finishes";
import {
  GROUNDS,
  INKS,
  MIN_CONTRAST,
  TYPEFACES,
  contrastRatio,
  fitFontSize,
  getGround,
  getInk,
  getTypeface,
} from "@/components/artwork/text-art-options";
import { cn } from "@/lib/utils";

export interface TextArtConfig {
  text: string;
  typeface: string;
  ink: string;
  ground: string;
  finish: string;
}

/**
 * Live configurator for text-based pieces.
 *
 * The preview is rendered in the DOM rather than on a canvas, deliberately:
 * the customer sees the actual typefaces the studio will set the words in,
 * the text stays selectable and readable by assistive technology, and it
 * scales with the layout without any redraw. A canvas would give a
 * downloadable bitmap and nothing else worth having here.
 *
 * Type is sized to fit the canvas from the longest line and the line count,
 * which is what a typesetter does by eye — so a customer typing a long verse
 * sees it get smaller rather than run off the edge.
 */
export function TextArtConfigurator({
  aspect,
  defaultText,
  defaultFinish,
  onChange,
  widthCm,
  heightCm,
}: {
  /** width / height of the finished piece. */
  aspect: number;
  defaultText: string;
  defaultFinish: string;
  onChange?: (config: TextArtConfig) => void;
  widthCm: number;
  heightCm: number;
}) {
  const fieldId = useId();
  const [text, setText] = useState(defaultText);
  const [typefaceId, setTypefaceId] = useState(TYPEFACES[0].id);
  const [inkId, setInkId] = useState(INKS[0].id);
  const [groundId, setGroundId] = useState(GROUNDS[0].id);
  const [finishId, setFinishId] = useState(defaultFinish);

  const typeface = getTypeface(typefaceId);
  const ink = getInk(inkId);
  const ground = getGround(groundId);
  const finish = getMount(finishId);
  // The short edge of the preview in its own units: 100cqw for a portrait piece,
  // less for a landscape one, since cqw is a share of the container width.
  const shadow = mountShadow(finishId, 100 * Math.min(1, heightCm / widthCm));

  const lines = useMemo(
    () => text.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 5),
    [text],
  );

  const fontSize = useMemo(
    () =>
      fitFontSize(
        lines.length ? lines : ["Your words"],
        aspect,
        typeface.advance,
        typeface.lineHeight,
      ),
    [lines, aspect, typeface.advance, typeface.lineHeight],
  );

  const contrast = contrastRatio(ink.value, ground.value);
  const lowContrast = contrast < MIN_CONTRAST;

  const emit = (next: Partial<TextArtConfig>) => {
    onChange?.({
      text,
      typeface: typefaceId,
      ink: inkId,
      ground: groundId,
      finish: finishId,
      ...next,
    });
  };

  const optionClass = (active: boolean) =>
    cn(
      "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium transition-colors",
      active
        ? "border-ink bg-ink text-background"
        : "border-line bg-surface text-muted hover:border-ink hover:text-ink",
    );

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:gap-10">
      {/* Preview */}
      <div>
        <div
          className="mx-auto w-full max-w-md"
        >
          <div
            className="@container relative flex items-center justify-center overflow-hidden"
            style={{
              aspectRatio: `${aspect}`,
              backgroundColor: ground.value,
            }}
          >
            <p
              // dir follows the chosen voice, so Urdu and Arabic run
              // right-to-left. "auto" rather than "rtl" so a Latin word typed
              // into an RTL face still reads correctly.
              dir={typeface.rtl ? "auto" : "ltr"}
              className="whitespace-pre-line px-[6%] text-center"
              style={{
                lineHeight: typeface.lineHeight ?? 1.22,
                fontFamily: typeface.stack,
                fontWeight: typeface.weight,
                fontStyle: typeface.italic ? "italic" : "normal",
                letterSpacing: typeface.letterSpacing,
                color: ink.value,
                fontSize: `${fontSize}cqw`,
                /**
                 * The mounting, drawn rather than described.
                 *
                 * This chooser changed the caption underneath the preview and
                 * nothing else — measured, the pixels that differed between
                 * flush and 25mm standoff were confined to a twelve-pixel band
                 * at the bottom of a 640px preview, which is that caption. Four
                 * options describing four depths, one picture.
                 *
                 * `text-shadow` rather than a `drop-shadow` filter because this
                 * is text; the numbers come from the same `mountShadow` the
                 * artwork tile uses, in `cqw` because that is the unit this
                 * preview is already sized in. The short edge of a portrait
                 * preview is its width, which is 100cqw; a landscape one is
                 * shorter than it is wide, so the ratio scales it down.
                 */
                textShadow: `${shadow.offset.toFixed(2)}cqw ${shadow.offset.toFixed(2)}cqw ` +
                  `${shadow.blur.toFixed(2)}cqw rgba(0,0,0,${shadow.opacity})`,
              }}
            >
              {lines.length ? lines.join("\n") : "Your words"}
            </p>
          </div>
        </div>
        <p className="mt-3 text-center text-xs leading-5 text-muted">
          Shown at {widthCm} × {heightCm} cm, {finish.name.toLowerCase()}.
          Proportions are exact; colour on screen is approximate.
        </p>
      </div>

      {/* Controls */}
      <div className="space-y-6">
        <div>
          <label htmlFor={fieldId} className="block text-sm font-medium">
            Your words
          </label>
          <textarea
            id={fieldId}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              emit({ text: e.target.value });
            }}
            rows={3}
            maxLength={160}
            // The field has to match the script being typed, or the caret and
            // punctuation land on the wrong side of the words.
            dir={typeface.rtl ? "auto" : "ltr"}
            placeholder={"One line per line break\nUp to five lines"}
            // Global :focus-visible outline left intact — see inquiry-form.
            className="mt-1.5 block min-h-24 w-full resize-y rounded-lg border border-line bg-background px-4 py-3 text-base leading-7 focus:border-ink"
          />
          <p className="mt-1 text-xs text-muted">
            {text.length}/160 characters, up to five lines. Type is sized to fit.
          </p>
        </div>

        <fieldset className="border-0 p-0">
          <legend className="text-xs font-semibold uppercase tracking-widest text-muted">
            Voice
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {TYPEFACES.map((face) => (
              <button
                key={face.id}
                type="button"
                onClick={() => {
                  setTypefaceId(face.id);
                  emit({ typeface: face.id });
                }}
                aria-pressed={face.id === typefaceId}
                className={optionClass(face.id === typefaceId)}
              >
                {face.name}
              </button>
            ))}
          </div>
          <p className="mt-2 text-sm leading-6 text-muted">{typeface.note}</p>
        </fieldset>

        <fieldset className="border-0 p-0">
          <legend className="text-xs font-semibold uppercase tracking-widest text-muted">
            Ink
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {INKS.map((colour) => (
              <button
                key={colour.id}
                type="button"
                onClick={() => {
                  setInkId(colour.id);
                  emit({ ink: colour.id });
                }}
                aria-pressed={colour.id === inkId}
                className={cn(optionClass(colour.id === inkId), "gap-2 pl-3")}
              >
                <span
                  aria-hidden
                  className="h-4 w-4 rounded-full ring-1 ring-black/15"
                  style={{ backgroundColor: colour.value }}
                />
                {colour.name}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="border-0 p-0">
          <legend className="text-xs font-semibold uppercase tracking-widest text-muted">
            Wall
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {GROUNDS.map((colour) => (
              <button
                key={colour.id}
                type="button"
                onClick={() => {
                  setGroundId(colour.id);
                  emit({ ground: colour.id });
                }}
                aria-pressed={colour.id === groundId}
                className={cn(optionClass(colour.id === groundId), "gap-2 pl-3")}
              >
                <span
                  aria-hidden
                  className="h-4 w-4 rounded-full ring-1 ring-black/15"
                  style={{ backgroundColor: colour.value }}
                />
                {colour.name}
              </button>
            ))}
          </div>
          {lowContrast && (
            <p role="status" className="mt-2 text-sm leading-6 text-accent">
              These two are close in tone — the words will be hard to read from
              across a room. We would raise this before printing, so it is worth
              changing one of them now.
            </p>
          )}
        </fieldset>

        <fieldset className="border-0 p-0">
          <legend className="text-xs font-semibold uppercase tracking-widest text-muted">
            Mounting
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {MOUNTS.map((option: (typeof MOUNTS)[number]) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setFinishId(option.id);
                  emit({ finish: option.id });
                }}
                aria-pressed={option.id === finishId}
                className={optionClass(option.id === finishId)}
              >
                {option.name}
              </button>
            ))}
          </div>
          <p className="mt-2 text-sm leading-6 text-muted">{finish.description}</p>
        </fieldset>
      </div>
    </div>
  );
}
