import { z } from "zod";

import { createHttpClient, type HttpClientOptions, ProviderError } from "./http";
import { tmdbPopularity } from "./popularity";
import { unique, yearOf } from "./text";
import type { MediaProvider, ProviderSearchItem, ProviderTitle, SearchOptions } from "./types";

export const TMDB_API_URL = "https://api.themoviedb.org/3";
export const TMDB_IMAGE_URL = "https://image.tmdb.org/t/p";
/** Género "Animación" (mismo id en películas y series). */
const ANIMATION_GENRE_ID = 16;

/** URL de una imagen de TMDB (`w342` para pósters de grid, según docs/design/HANDOFF.md §8). */
export function tmdbImageUrl(path: string | null | undefined, size = "w342") {
  return path ? `${TMDB_IMAGE_URL}/${size}${path}` : null;
}

// ── Esquemas de la API de TMDB (solo lo que usamos; el resto se ignora) ───────

const searchResultSchema = z.object({
  id: z.number(),
  media_type: z.enum(["movie", "tv", "person"]).optional(),
  title: z.string().optional(),
  name: z.string().optional(),
  original_title: z.string().optional(),
  original_name: z.string().optional(),
  original_language: z.string().optional(),
  release_date: z.string().optional(),
  first_air_date: z.string().optional(),
  genre_ids: z.array(z.number()).optional(),
  overview: z.string().nullish(),
  poster_path: z.string().nullish(),
  popularity: z.number().nullish(),
  adult: z.boolean().optional(),
  softcore: z.boolean().optional(),
});
type SearchResult = z.infer<typeof searchResultSchema>;

const pageSchema = z.object({ results: z.array(searchResultSchema) });

const named = z.object({ name: z.string() });
const detailsSchema = searchResultSchema.extend({
  genres: z.array(z.object({ id: z.number(), name: z.string() })).default([]),
  backdrop_path: z.string().nullish(),
  runtime: z.number().nullish(),
  episode_run_time: z.array(z.number()).optional(),
  last_episode_to_air: z.object({ runtime: z.number().nullish() }).nullish(),
  number_of_episodes: z.number().nullish(),
  number_of_seasons: z.number().nullish(),
  created_by: z.array(named).optional(),
  credits: z.object({ crew: z.array(z.object({ name: z.string(), job: z.string() })) }).optional(),
  keywords: z.object({ keywords: z.array(named).optional(), results: z.array(named).optional() }).optional(),
});

type Kind = "movie" | "tv";

function parseExternalId(externalId: string): { kind: Kind; id: number } | null {
  const match = /^(movie|tv):(\d+)$/.exec(externalId);
  return match ? { kind: match[1] as Kind, id: Number(match[2]) } : null;
}

const isAnime = (r: SearchResult) =>
  r.original_language === "ja" && (r.genre_ids ?? []).includes(ANIMATION_GENRE_ID);

const isAdult = (r: SearchResult) => r.adult === true || r.softcore === true;

function toSearchItem(r: SearchResult, kind: Kind): ProviderSearchItem {
  const title = (kind === "movie" ? r.title : r.name) ?? "";
  const originalTitle = (kind === "movie" ? r.original_title : r.original_name) ?? null;
  const anime = isAnime(r);
  return {
    source: "TMDB",
    externalId: `${kind}:${r.id}`,
    tmdbId: r.id,
    type: anime ? "ANIME" : kind === "movie" ? "MOVIE" : "SERIES",
    title,
    originalTitle: originalTitle && originalTitle !== title ? originalTitle : null,
    altTitles: unique([title, originalTitle].filter((t): t is string => !!t)),
    year: yearOf(kind === "movie" ? r.release_date : r.first_air_date),
    posterUrl: tmdbImageUrl(r.poster_path),
    overview: r.overview || null,
    popularity: tmdbPopularity(r.popularity),
    animeCandidate: anime,
  };
}

export type TmdbProviderOptions = Omit<HttpClientOptions, "source"> & {
  /** "API Read Access Token" de TMDB (nunca llega al navegador). */
  token: string;
  /** Idioma de títulos y sinopsis. */
  language?: string;
  baseUrl?: string;
};

/** Películas y series de TMDB. Filtra contenido adulto y marca lo que parece anime. */
export function createTmdbProvider({
  token,
  language = "es-ES",
  baseUrl = TMDB_API_URL,
  ...http
}: TmdbProviderOptions): MediaProvider {
  const request = createHttpClient({ source: "TMDB", ...http });

  async function get<T>(
    path: string,
    params: Record<string, string>,
    schema: z.ZodType<T>,
    signal?: AbortSignal,
  ) {
    const url = new URL(`${baseUrl}${path}`);
    for (const [key, value] of Object.entries({ language, ...params })) url.searchParams.set(key, value);
    const res = await request(url.toString(), {
      headers: { authorization: `Bearer ${token}`, accept: "application/json" },
      ...(signal && { signal }),
    });
    const body: unknown = await res.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success)
      throw new ProviderError("TMDB", res.status, `TMDB devolvió un formato inesperado en ${path}`);
    return { data: parsed.data, body };
  }

  return {
    source: "TMDB",

    async search(query: string, { type, limit = 20, signal }: SearchOptions = {}) {
      const { data } = await get(
        "/search/multi",
        { query, include_adult: "false", page: "1" },
        pageSchema,
        signal,
      );
      return data.results
        .filter((r) => (r.media_type === "movie" || r.media_type === "tv") && !isAdult(r))
        .map((r) => toSearchItem(r, r.media_type as Kind))
        .filter((item) => !type || item.type === type)
        .slice(0, limit);
    },

    async getDetails(externalId, { signal } = {}) {
      const ref = parseExternalId(externalId);
      if (!ref) return null;

      let result;
      try {
        result = await get(
          `/${ref.kind}/${ref.id}`,
          { append_to_response: ref.kind === "movie" ? "credits,keywords" : "keywords" },
          detailsSchema,
          signal,
        );
      } catch (error) {
        if (error instanceof ProviderError && error.status === 404) return null;
        throw error;
      }
      const d = result.data;
      if (isAdult(d)) return null;

      // La ficha trae `genres: [{ id, name }]` en vez de `genre_ids`: misma regla de anime que la búsqueda.
      const item = toSearchItem({ ...d, genre_ids: d.genres.map((g) => g.id) }, ref.kind);
      const keywords = d.keywords?.keywords ?? d.keywords?.results ?? [];
      const people =
        ref.kind === "movie"
          ? (d.credits?.crew ?? []).filter((c) => c.job === "Director").map((c) => c.name)
          : (d.created_by ?? []).map((c) => c.name);

      return {
        source: "TMDB",
        externalId,
        tmdbId: ref.id,
        type: item.type,
        title: item.title,
        originalTitle: item.originalTitle,
        year: item.year,
        posterPath: d.poster_path ?? null,
        backdropPath: d.backdrop_path ?? null,
        overview: item.overview,
        genres: d.genres.map((g) => g.name),
        tags: keywords.slice(0, 20).map((k) => k.name),
        people: unique(people),
        runtimeMin:
          ref.kind === "movie"
            ? (d.runtime ?? null)
            : (d.episode_run_time?.[0] ?? d.last_episode_to_air?.runtime ?? null),
        episodes: ref.kind === "tv" ? (d.number_of_episodes ?? null) : null,
        seasons: ref.kind === "tv" ? (d.number_of_seasons ?? null) : null,
        raw: result.body,
      } satisfies ProviderTitle;
    },

    async getRecommendations(externalId, { limit = 20, signal } = {}) {
      const ref = parseExternalId(externalId);
      if (!ref) return [];
      const { data } = await get(`/${ref.kind}/${ref.id}/recommendations`, { page: "1" }, pageSchema, signal);
      return data.results
        .filter((r) => !isAdult(r))
        .map((r) => toSearchItem(r, ref.kind))
        .slice(0, limit);
    },
  };
}
