import { normalizeTitle } from "./text";
import type { MediaProvider, MediaType, ProviderSearchItem, Source } from "./types";

export type SourceStatus = "ok" | "error" | "disabled" | "skipped";

export type UnifiedSearchResult = {
  items: ProviderSearchItem[];
  sources: Record<"tmdb" | "anilist", SourceStatus>;
};

/** Años compatibles: el estreno puede diferir un año entre catálogos (temporada de invierno, etc.). */
const sameYear = (a: number | null, b: number | null) => a === null || b === null || Math.abs(a - b) <= 1;

function sharesTitle(a: ProviderSearchItem, b: ProviderSearchItem) {
  const titles = new Set(a.altTitles.map(normalizeTitle).filter(Boolean));
  return b.altTitles.some((title) => titles.has(normalizeTitle(title)));
}

/**
 * Deduplica anime: cada resultado de TMDB que parece anime y coincide (título + año) con uno de
 * AniList desaparece, y el de AniList guarda su id de TMDB como referencia cruzada
 * (docs/SPEC.md, "Anime en ambos catálogos"). Los anime de TMDB sin pareja se quedan.
 */
export function dedupeAnime(tmdb: ProviderSearchItem[], anilist: ProviderSearchItem[]) {
  const anime = anilist.map((item) => ({ ...item }));
  const kept: ProviderSearchItem[] = [];

  for (const item of tmdb) {
    if (!item.animeCandidate) {
      kept.push(item);
      continue;
    }
    // AniList ya viene ordenado por relevancia: la primera coincidencia libre es la mejor.
    const match = anime.find((a) => a.tmdbId === null && sameYear(a.year, item.year) && sharesTitle(a, item));
    if (match) match.tmdbId = item.tmdbId;
    else kept.push(item);
  }

  return { tmdb: kept, anilist: anime };
}

/** 3 = título exacto · 2 = empieza por la búsqueda · 1 = la contiene · 0 = otra coincidencia del proveedor. */
export function matchScore(item: ProviderSearchItem, query: string) {
  const q = normalizeTitle(query);
  let best = 0;
  for (const raw of item.altTitles) {
    const title = normalizeTitle(raw);
    if (title === q) return 3;
    if (title.startsWith(q)) best = Math.max(best, 2);
    else if (title.includes(q)) best = Math.max(best, 1);
  }
  return best;
}

/**
 * Mezcla las listas de ambos proveedores: primero por coincidencia del título con la búsqueda
 * y, a igualdad, por popularidad normalizada (así "Dune" de 2021 va antes que un anime de nicho
 * con el mismo título). Con popularidad igual se respeta el orden original de cada proveedor.
 */
export function rankResults(lists: ProviderSearchItem[][], query: string) {
  return lists
    .flatMap((list) => list.map((item, index) => ({ item, score: matchScore(item, query), index })))
    .sort((a, b) => b.score - a.score || b.item.popularity - a.item.popularity || a.index - b.index)
    .map(({ item }) => item);
}

/** Qué proveedores hacen falta para cada filtro (AniList tiene un límite de tasa bajo). */
function wanted(type: MediaType | undefined): Record<Source, boolean> {
  return { TMDB: true, ANILIST: !type || type === "ANIME" };
}

/**
 * Búsqueda unificada: consulta TMDB y AniList en paralelo, deduplica anime y mezcla.
 * Si un proveedor falla devuelve lo del otro y lo indica en `sources`; si fallan todos, lanza.
 */
export async function unifiedSearch(
  providers: { tmdb?: MediaProvider | undefined; anilist?: MediaProvider | undefined },
  query: string,
  { type, limit = 20, signal }: { type?: MediaType | undefined; limit?: number; signal?: AbortSignal } = {},
): Promise<UnifiedSearchResult> {
  const want = wanted(type);
  const run = (provider: MediaProvider | undefined, needed: boolean) =>
    provider && needed ? provider.search(query, { type, limit, signal }) : Promise.resolve(null);

  const [tmdb, anilist] = await Promise.allSettled([
    run(providers.tmdb, want.TMDB),
    run(providers.anilist, want.ANILIST),
  ]);

  const status = (
    provider: MediaProvider | undefined,
    needed: boolean,
    result: PromiseSettledResult<unknown>,
  ) => (!provider ? "disabled" : !needed ? "skipped" : result.status === "fulfilled" ? "ok" : "error");
  const sources = {
    tmdb: status(providers.tmdb, want.TMDB, tmdb),
    anilist: status(providers.anilist, want.ANILIST, anilist),
  } satisfies UnifiedSearchResult["sources"];

  const attempted = Object.values(sources).filter((s) => s === "ok" || s === "error");
  if (attempted.length > 0 && attempted.every((s) => s === "error")) {
    const reason = [tmdb, anilist].find((r) => r.status === "rejected") as PromiseRejectedResult;
    throw reason.reason;
  }

  const deduped = dedupeAnime(
    tmdb.status === "fulfilled" ? (tmdb.value ?? []) : [],
    anilist.status === "fulfilled" ? (anilist.value ?? []) : [],
  );
  return { items: rankResults([deduped.tmdb, deduped.anilist], query).slice(0, limit), sources };
}
