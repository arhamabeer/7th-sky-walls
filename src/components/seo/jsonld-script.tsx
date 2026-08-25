import type { Thing, WithContext } from "schema-dts";

/**
 * Renders a JSON-LD block as a native script tag (Next.js-recommended
 * approach). '<' is escaped to prevent HTML injection via content strings.
 */
export function JsonLd({ data }: { data: WithContext<Thing> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
