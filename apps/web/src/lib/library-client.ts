import {
  type AddToLibraryRequest,
  addToLibraryResponseSchema,
  libraryEntryResponseSchema,
  libraryTagsResponseSchema,
  searchResponseSchema,
  type SearchTypeFilter,
  type UpdateLibraryEntryRequest,
} from "@watchlog/contracts";
import { z } from "zod";

import { apiFetch } from "./api-client";

/** Llamadas a la API de búsqueda y biblioteca desde componentes cliente (validadas con los contratos). */

export function searchTitles(
  q: string,
  { type = "all", signal }: { type?: SearchTypeFilter; signal?: AbortSignal } = {},
) {
  const params = new URLSearchParams({ q, type });
  return apiFetch(`/api/search?${params}`, searchResponseSchema, signal ? { signal } : {});
}

export function addToLibrary(body: AddToLibraryRequest) {
  return apiFetch("/api/library", addToLibraryResponseSchema, { method: "POST", body: JSON.stringify(body) });
}

export function updateEntry(id: string, body: UpdateLibraryEntryRequest) {
  return apiFetch(`/api/library/${encodeURIComponent(id)}`, libraryEntryResponseSchema, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteEntry(id: string) {
  return apiFetch(`/api/library/${encodeURIComponent(id)}`, z.undefined(), { method: "DELETE" });
}

export function fetchUserTags() {
  return apiFetch("/api/library/tags", libraryTagsResponseSchema);
}

/** Fecha local de hoy como `YYYY-MM-DD` (los visionados son días del calendario del usuario). */
export function todayCalendarDate(now = new Date()) {
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}
