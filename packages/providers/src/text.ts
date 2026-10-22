/** Normaliza un título para comparar: minúsculas, sin acentos ni puntuación, espacios simples. */
export function normalizeTitle(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** Año de una fecha `YYYY-MM-DD` (TMDB devuelve "" cuando no la sabe). */
export function yearOf(date: string | null | undefined) {
  const year = date ? Number.parseInt(date.slice(0, 4), 10) : Number.NaN;
  return Number.isFinite(year) ? year : null;
}

/** Quita etiquetas HTML y entidades básicas (las descripciones de AniList traen `<br>`, `<i>`…). */
export function stripHtml(value: string | null | undefined) {
  if (!value) return null;
  const text = value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/<\/?[a-z][^>]*$/i, "") // etiqueta sin cerrar al final (texto truncado)
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text || null;
}

export const unique = <T>(values: T[]) => [...new Set(values)];
