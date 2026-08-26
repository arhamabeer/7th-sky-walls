import Link from "next/link";
import { copy } from "@/content/copy";
import type { Material } from "@/lib/content/schema";

/**
 * The six materials side by side.
 *
 * Shared between the materials page and About, which is the point: About used to
 * carry its own copy of the full cards, duplicating every word of `why` and
 * `fire` on a second URL. Search engines read that as two pages competing to
 * answer the same question, and a maintainer reads it as two places to update.
 * The table is the short form, so About can carry it without repeating the prose.
 *
 * `linkRows` decides whether a material's name jumps to its detail card on the
 * same page or navigates to the materials page. On About there is nothing to jump
 * to, and a same-page anchor that goes nowhere is worse than a link.
 */
export function MaterialComparisonTable({
  materials,
  linkRows,
}: {
  materials: Material[];
  linkRows: "anchor" | "page";
}) {
  const t = copy.materials;
  // min-h-11 because these are the only interactive elements in the table and a
  // bare inline link in a table cell measured 19px on a phone.
  const linkClass =
    "inline-flex min-h-11 items-center underline decoration-line underline-offset-4 hover:decoration-ink";
  // The widest column, and the one already repeated on every detail card. Hiding
  // it below sm is what lets three columns fit a 320px phone without the table
  // scrolling sideways.
  const wideOnly = "hidden sm:table-cell";

  return (
    // A scroller with no negative margin. The full-bleed trick (-mx-4 px-4) made
    // this element wider than its parent, and the parent is inside Container and
    // has no scroller of its own — so the audit correctly reported both a clipped
    // parent and text extending past the viewport on every phone. Inside the
    // container's own width there is nothing to bleed past.
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
            <th scope="col" className="py-3 pr-4 font-semibold">
              {t.columns.material}
            </th>
            <th scope="col" className="py-3 pr-4 font-semibold">
              {t.columns.depth}
            </th>
            <th scope="col" className="py-3 pr-4 font-semibold">
              {t.columns.fire}
            </th>
            <th scope="col" className={`py-3 font-semibold ${wideOnly}`}>
              {t.columns.bestFor}
            </th>
          </tr>
        </thead>
        <tbody>
          {materials.map((material) => (
            <tr key={material.id} className="border-b border-line align-top">
              <th scope="row" className="py-3.5 pr-4 text-left font-medium">
                {linkRows === "anchor" ? (
                  <a href={`#${material.id}`} className={linkClass}>
                    {material.name}
                  </a>
                ) : (
                  <Link href={`/materials#${material.id}`} className={linkClass}>
                    {material.name}
                  </Link>
                )}
              </th>
              {/* nowrap: the column is narrow enough on a phone to break "10 mm"
                  across two lines, which reads as a different number. */}
              <td className="whitespace-nowrap py-3.5 pr-4 tabular-nums text-muted">
                {material.depthMm} mm
              </td>
              <td className="py-3.5 pr-4 text-muted">{material.fireShort}</td>
              <td className={`py-3.5 text-muted ${wideOnly}`}>{material.bestFor}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
