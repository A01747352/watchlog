/**
 * Popularidad comparable entre catálogos. Las escalas no se parecen: TMDB da un índice de
 * actividad (un estreno muy visto ronda 50–150) y AniList cuenta usuarios que lo tienen en
 * su lista (un éxito pasa de 500 000). Cada una se pasa a 0–1 en escala logarítmica entre
 * lo que en ese catálogo es "nicho" (0) y "éxito" (1), calibrado con datos reales
 * (Dune 2021: TMDB 48 → 0.73; "DUNE" anime 2017: AniList 3 700 → 0.19).
 */
function logScale(value: number | null | undefined, niche: number, hit: number) {
  if (!value || value <= niche) return 0;
  return Math.min(1, Math.log10(value / niche) / Math.log10(hit / niche));
}

export const tmdbPopularity = (popularity: number | null | undefined) => logScale(popularity, 1, 200);

export const anilistPopularity = (popularity: number | null | undefined) =>
  logScale(popularity, 1_000, 1_000_000);
