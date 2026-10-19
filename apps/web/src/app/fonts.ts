import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";

/*
 * Fuentes de docs/design (HANDOFF §2) servidas con next/font (self-hosted, sin CLS).
 * Exponen --font-*-loaded, que tokens.css usa en --font-display/sans/mono.
 */
export const fontDisplay = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  axes: ["opsz"],
  variable: "--font-display-loaded",
  display: "swap",
});

export const fontSans = Geist({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans-loaded",
  display: "swap",
});

export const fontMono = Geist_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-mono-loaded",
  display: "swap",
});
