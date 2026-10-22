import { z } from "zod";

import { libraryStatusSchema, type MediaType, mediaTypeSchema, sourceSchema } from "./enums";

/** Filtro de la búsqueda (en minúsculas porque viaja en la URL). */
export const searchTypeFilterSchema = z.enum(["all", "movie", "series", "anime"]);
export type SearchTypeFilter = z.infer<typeof searchTypeFilterSchema>;

export const searchTypeToMediaType: Record<SearchTypeFilter, MediaType | undefined> = {
  all: undefined,
  movie: "MOVIE",
  series: "SERIES",
  anime: "ANIME",
};

/** `GET /api/search?q=…&type=…` (con sesión). */
export const searchQuerySchema = z.object({
  q: z.string().trim().min(1, "Escribe algo para buscar").max(100, "La búsqueda es demasiado larga"),
  type: searchTypeFilterSchema.default("all"),
});
export type SearchQuery = z.infer<typeof searchQuerySchema>;

export const searchResultSchema = z.object({
  source: sourceSchema,
  /** Id en el proveedor; en TMDB lleva el tipo delante (`movie:438631`). */
  externalId: z.string().min(1),
  /** Referencia cruzada a TMDB para anime que existe en ambos catálogos. */
  tmdbId: z.number().int().nullable(),
  type: mediaTypeSchema,
  title: z.string(),
  originalTitle: z.string().nullable(),
  year: z.number().int().nullable(),
  posterUrl: z.url().nullable(),
  overview: z.string().nullable(),
  /** Si ya está en la biblioteca del usuario: su entrada y estado (si no, null). */
  library: z
    .object({
      entryId: z.string(),
      status: libraryStatusSchema,
    })
    .nullable(),
});
export type SearchResult = z.infer<typeof searchResultSchema>;

/** Estado de cada proveedor: si uno falla, la búsqueda devuelve lo del otro. */
export const sourceStatusSchema = z.enum(["ok", "error", "disabled", "skipped"]);
export type SourceStatus = z.infer<typeof sourceStatusSchema>;

export const searchResponseSchema = z.object({
  query: z.string(),
  type: searchTypeFilterSchema,
  results: z.array(searchResultSchema),
  sources: z.object({ tmdb: sourceStatusSchema, anilist: sourceStatusSchema }),
});
export type SearchResponse = z.infer<typeof searchResponseSchema>;
