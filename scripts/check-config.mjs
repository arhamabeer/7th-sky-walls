/**
 * Refuses to call the site launch-ready while its contact details are invented.
 *
 * The launch checklist's first item is "replace every TODO in site.config.ts",
 * and nothing enforced it. That matters more than an unfinished checkbox,
 * because those placeholders are not inert text — they are live links on every
 * page:
 *
 *   - `https://wa.me/923000000000` is the site's most prominent call to action,
 *     in the header, the footer, every artwork page, the planner and the contact
 *     page. It opens WhatsApp to a number that does not exist.
 *   - `mailto:hello@example.com` opens a compose window addressed to a reserved
 *     example domain that is guaranteed never to receive it.
 *   - `tel:+923000000000` dials a number that is not the studio's.
 *
 * Put together with an unset `RESEND_API_KEY` — where the form honestly says it
 * could not send and hands over to WhatsApp or email instead — an inquiry has no
 * working route to the studio at all. Every path on this site ends in an inquiry,
 * so that is the whole site quietly not working while looking finished.
 *
 * The placeholders are deliberate and were confirmed to stay visible: honest
 * text beats invented data, and a visitor can see the studio has not filled them
 * in. What was missing is a check that stops them reaching production.
 *
 * Usage: node scripts/check-config.mjs
 * Exit 1 while any placeholder remains, so the launch checklist has teeth.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const source = readFileSync(path.join(ROOT, "src", "config", "site.config.ts"), "utf8");

/**
 * Read a string value by its key path, from the source rather than by importing.
 *
 * The config is TypeScript and this is a .mjs script, and the alternative —
 * a second copy of the values here — is the defect this codebase produces most.
 */
function value(key) {
  const found = source.match(new RegExp(`${key}:\\s*"([^"]*)"`));
  return found ? found[1] : null;
}

function numberValue(key) {
  const found = source.match(new RegExp(`${key}:\\s*(-?\\d+(?:\\.\\d+)?)`));
  return found ? Number(found[1]) : null;
}

/**
 * Each check names what breaks, not just what is unset.
 *
 * `blocking` is what stops an inquiry reaching the studio; the rest are wrong
 * in public but do not swallow a lead. Both fail the gate — the distinction is
 * there so whoever reads the output knows what to fix first.
 */
const CHECKS = [
  {
    key: "contact.whatsapp",
    blocking: true,
    actual: value("whatsapp"),
    bad: (v) => v === null || /^9230+$/.test(v) || /0{6}/.test(v),
    breaks: "every Chat on WhatsApp button, and the handover the form offers when email is unset",
  },
  {
    key: "contact.email",
    blocking: true,
    actual: value("email"),
    bad: (v) => v === null || /@example\.(com|org|net)$/i.test(v),
    breaks: "the mailto handover, and the address the inquiry email would come from",
  },
  {
    key: "contact.phone",
    blocking: false,
    actual: value("phone"),
    bad: (v) => v === null || /0{6}/.test(v.replace(/\s/g, "")),
    breaks: "the tel: link in the footer and on the contact page",
  },
  {
    key: "contact.address.street",
    blocking: false,
    actual: value("street"),
    bad: (v) => v === null || /pending|tbd|todo/i.test(v),
    breaks: "the studio address on the contact page and the LocalBusiness structured data",
  },
  {
    key: "url",
    blocking: false,
    actual: value("url"),
    bad: (v) => v === null || /vercel\.app$/.test(v),
    breaks: "canonical URLs, the sitemap, robots.txt and every absolute link in structured data",
  },
  {
    key: "social.instagram",
    blocking: false,
    actual: value("instagram"),
    bad: (v) => v !== null && v !== "" && /instagram\.com\/example\/?$/.test(v),
    breaks: "the Instagram link in the footer",
  },
  {
    key: "foundingYear",
    blocking: false,
    actual: numberValue("foundingYear"),
    bad: (v) => v === null,
    breaks: "the founded year on the About page and in LocalBusiness structured data",
  },
];

/** A check that cannot read its value would pass without checking anything. */
const unreadable = CHECKS.filter((c) => c.actual === null);
if (unreadable.length) {
  console.error(
    `Could not read ${unreadable.map((c) => c.key).join(", ")} from site.config.ts — ` +
      `the shape changed, and this check will not report on values it did not find.`,
  );
  process.exit(2);
}

const outstanding = CHECKS.filter((c) => c.bad(c.actual));
const blocking = outstanding.filter((c) => c.blocking);

console.log(`Checked ${CHECKS.length} configured values in src/config/site.config.ts.`);

if (outstanding.length === 0) {
  console.log("RESULT: PASS — no placeholder business details remain.");
  process.exit(0);
}

if (blocking.length) {
  console.log(`\nStops an inquiry reaching the studio (${blocking.length}):`);
  for (const c of blocking) {
    console.log(`  ${c.key} = ${JSON.stringify(c.actual)}\n      breaks ${c.breaks}`);
  }
}

const cosmetic = outstanding.filter((c) => !c.blocking);
if (cosmetic.length) {
  console.log(`\nWrong in public, but does not swallow a lead (${cosmetic.length}):`);
  for (const c of cosmetic) {
    console.log(`  ${c.key} = ${JSON.stringify(c.actual)}\n      breaks ${c.breaks}`);
  }
}

console.log(
  `\nRESULT: FAIL — ${outstanding.length} placeholder(s) still in site.config.ts. ` +
    `Expected before launch and while the studio's details are outstanding; this gate ` +
    `exists so they cannot ship unnoticed.`,
);
process.exit(1);
