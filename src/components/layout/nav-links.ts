import { copy } from "@/content/copy";

export const NAV_LINKS = [
  { href: "/", label: copy.nav.home },
  { href: "/portfolio", label: copy.nav.portfolio },
  { href: "/services", label: copy.nav.services },
  { href: "/about", label: copy.nav.about },
  { href: "/contact", label: copy.nav.contact },
] as const;
