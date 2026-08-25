"use client";

import { Button } from "@/components/ui/button";

/**
 * Opens the print dialog.
 *
 * The only reason this route has any client JavaScript at all. Every other
 * control here is a link, so the mode, size and paper choices work without
 * scripts and each one is a URL somebody can send to whoever owns the printer.
 * Printing itself has no link equivalent, and telling a visitor to find Ctrl+P
 * on the page whose entire purpose is printing would be an odd place to stop.
 */
export function PrintButton({
  label,
  sheets,
  sheet,
  sheets_,
}: {
  label: string;
  sheets: number;
  /** Singular and plural nouns, passed in so the copy stays in one file. */
  sheet: string;
  sheets_: string;
}) {
  return (
    <Button type="button" onClick={() => window.print()}>
      {label}
      <span className="ml-2 text-xs font-normal opacity-75">
        {sheets} {sheets === 1 ? sheet : sheets_}
      </span>
    </Button>
  );
}
