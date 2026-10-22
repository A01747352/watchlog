import {
  type ApiError,
  searchQuerySchema,
  type SearchResponse,
  type SearchResult,
  searchTypeToMediaType,
} from "@watchlog/contracts";
import {
  type MediaProvider,
  normalizeTitle,
  type ProviderSearchItem,
  unifiedSearch,
} from "@watchlog/providers";
import { Hono } from "hono";

import type { Auth } from "../auth";
import { createTtlCache, type TtlCache } from "../lib/ttl-cache";
import { requireSession } from "../middleware/session";

export type SearchProviders = { tmdb?: MediaProvider | undefined; anilist?: MediaProvider | undefined };

const toResult = ({
  source,
  externalId,
  tmdbId,
  type,
  title,
  originalTitle,
  year,
  posterUrl,
  overview,
}: ProviderSearchItem): SearchResult => ({
  source,
  externalId,
  tmdbId,
  type,
  title,
  originalTitle,
  year,
  posterUrl,
  overview,
});

/**
 * `GET /api/search`: búsqueda unificada en TMDB (películas y series) y AniList (anime).
 * Exige sesión para no exponer las cuotas de los proveedores. Las respuestas completas
 * se cachean unos minutos en memoria; las parciales (un proveedor caído) no.
 */
export function searchRoute({
  auth,
  providers,
  cache = createTtlCache<SearchResponse>({ ttlMs: 5 * 60_000, maxEntries: 500 }),
}: {
  auth: Auth;
  providers: SearchProviders;
  cache?: TtlCache<SearchResponse>;
}) {
  return new Hono().get("/", requireSession(auth), async (c) => {
    const parsed = searchQuerySchema.safeParse(c.req.query());
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Petición inválida.";
      return c.json<ApiError>({ error: { code: "INVALID_REQUEST", message } }, 400);
    }
    const { q, type } = parsed.data;

    const key = `${type}:${normalizeTitle(q)}`;
    const cached = cache.get(key);
    if (cached) return c.json<SearchResponse>({ ...cached, query: q });

    let result;
    try {
      result = await unifiedSearch(providers, q, {
        type: searchTypeToMediaType[type],
        limit: 20,
        signal: c.req.raw.signal,
      });
    } catch (error) {
      console.warn("Búsqueda no disponible:", error instanceof Error ? error.message : error);
      return c.json<ApiError>(
        {
          error: {
            code: "SEARCH_UNAVAILABLE",
            message: "La búsqueda no está disponible ahora. Inténtalo en un momento.",
          },
        },
        502,
      );
    }

    const body: SearchResponse = {
      query: q,
      type,
      results: result.items.map(toResult),
      sources: result.sources,
    };
    if (!Object.values(result.sources).includes("error")) cache.set(key, body);
    return c.json<SearchResponse>(body);
  });
}
