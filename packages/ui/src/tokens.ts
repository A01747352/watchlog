/**
 * Catálogo de tokens de diseño (nombres de las variables CSS de tokens.css).
 * Sirve para documentarlos, pintarlos en la página de prueba de apps/web y
 * comprobar en tests que cada token existe en ambos temas.
 */

export const themes = ["dark", "light"] as const;
export type Theme = (typeof themes)[number];

export const colorTokenGroups = [
  {
    name: "Superficies",
    tokens: [
      "background",
      "card",
      "popover",
      "secondary",
      "muted",
      "accent",
      "border",
      "input",
      "sidebar",
      "overlay",
    ],
  },
  { name: "Texto", tokens: ["foreground", "muted-foreground", "subtle-foreground"] },
  { name: "Acción y marca", tokens: ["primary", "brand", "ring", "destructive"] },
  { name: "Tipo de contenido", tokens: ["type-movie", "type-series", "type-anime"] },
  {
    name: "Estado",
    tokens: ["status-pending", "status-watching", "status-completed", "status-paused", "status-dropped"],
  },
] as const;

export type ColorToken = (typeof colorTokenGroups)[number]["tokens"][number];

export const shadowTokens = ["shadow-sm", "shadow-md", "shadow-lg", "shadow-poster"] as const;

/** Radios en px (lg = --radius = 10px). */
export const radiusTokens = { xs: 4, sm: 6, md: 8, lg: 10, xl: 14, "2xl": 20 } as const;

/** Pasos de espaciado más usados (base 4px). */
export const spacingScale = [8, 12, 16, 20, 24, 32, 40] as const;

export const typeScale = [
  { name: "display", family: "display", spec: "Bricolage 40/44 · 600" },
  { name: "page", family: "display", spec: "Bricolage 34 (28 móvil) · 600" },
  { name: "rating", family: "display", spec: "Bricolage 64 (52 móvil) · 600" },
  { name: "h1", family: "display", spec: "Bricolage 32/37 · 600" },
  { name: "h2", family: "display", spec: "Bricolage 22/28 · 600" },
  { name: "h3", family: "sans", spec: "Geist 17/23 · 600" },
  { name: "body", family: "sans", spec: "Geist 14/21 · 400" },
  { name: "small", family: "sans", spec: "Geist 13/19 · 400" },
  { name: "caption", family: "mono", spec: "Geist Mono 12 · 500" },
] as const;

export const mediaTypes = ["movie", "series", "anime"] as const;
export type MediaType = (typeof mediaTypes)[number];
