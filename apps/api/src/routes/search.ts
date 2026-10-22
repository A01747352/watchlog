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
import type { DbClient } from "@watchlog/db";
import { Hono } from "hono";

import type { Auth } from "../auth";
import { createTtlCache, type TtlCache } from "../lib/ttl-cache";
import { requireSession } from "../middleware/session";
import { libraryStatusByRef } from "../services/library";

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
  library: null,
});

/**
 * `GET /api/search`: búsqueda unificada en TMDB (películas y series) y AniList (anime).
 * Exige sesión para no exponer las cuotas de los proveedores. Las respuestas completas
 * se cachean unos minutos en memoria; las parciales (un proveedor caído) no.
 */
export function searchRoute({
  db,
  auth,
  providers,
  cache = createTtlCache<SearchResponse>({ ttlMs: 5 * 60_000, maxEntries: 500 }),
}: {
  db: DbClient;
  auth: Auth;
  providers: SearchProviders;
  cache?: TtlCache<SearchResponse>;
}) {
  /** El estado en la biblioteca es de cada usuario: se añade después de la caché compartida. */
  async function withLibrary(body: SearchResponse, userId: string): Promise<SearchResponse> {
    const library = await libraryStatusByRef(db, userId, body.results);
    return {
      ...body,
      results: body.results.map((r) => ({
        ...r,
        library: library.get(`${r.source}:${r.externalId}`) ?? null,
      })),
    };
  }

  return new Hono().get("/", requireSession(auth), async (c) => {
    const parsed = searchQuerySchema.safeParse(c.req.query());
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Petición inválida.";
      return c.json<ApiError>({ error: { code: "INVALID_REQUEST", message } }, 400);
    }
    const { q, type } = parsed.data;

    const key = `${type}:${normalizeTitle(q)}`;
    const cached = cache.get(key);
    if (cached) return c.json<SearchResponse>(await withLibrary({ ...cached, query: q }, c.var.user.id));

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
    return c.json<SearchResponse>(await withLibrary(body, c.var.user.id));
  });
}
