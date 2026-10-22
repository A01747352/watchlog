import { apiErrorSchema, searchResponseSchema } from "@watchlog/contracts";
import { type MediaProvider, ProviderError, type ProviderSearchItem } from "@watchlog/providers";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { setupTestApp, signedInCookie } from "./support/app";

function item(overrides: Partial<ProviderSearchItem>): ProviderSearchItem {
  return {
    source: "TMDB",
    externalId: "movie:1",
    tmdbId: 1,
    type: "MOVIE",
    title: "Dune",
    originalTitle: null,
    altTitles: [overrides.title ?? "Dune"],
    year: 2021,
    posterUrl: "https://image.tmdb.org/t/p/w342/dune.jpg",
    overview: "Arena.",
    popularity: 0.5,
    animeCandidate: false,
    ...overrides,
  };
}

/** Proveedores falsos: la API no sale a la red; los clientes reales se prueban con MSW en packages/providers. */
function fakeProvider(source: "TMDB" | "ANILIST"): MediaProvider & { search: ReturnType<typeof vi.fn> } {
  return {
    source,
    search: vi.fn(async () => []),
    getDetails: vi.fn(async () => null),
    getRecommendations: vi.fn(async () => []),
  };
}

const tmdb = fakeProvider("TMDB");
const anilist = fakeProvider("ANILIST");

describe("GET /api/search", () => {
  const { app, db } = setupTestApp({}, { tmdb, anilist });

  beforeEach(() => {
    vi.clearAllMocks();
    tmdb.search.mockResolvedValue([
      item({}),
      item({
        externalId: "tv:209867",
        tmdbId: 209867,
        type: "ANIME",
        title: "Frieren",
        altTitles: ["Frieren", "葬送のフリーレン"],
        year: 2023,
        animeCandidate: true,
      }),
    ]);
    anilist.search.mockResolvedValue([
      item({
        source: "ANILIST",
        externalId: "154587",
        tmdbId: null,
        type: "ANIME",
        title: "Frieren",
        altTitles: ["Frieren", "Sousou no Frieren", "葬送のフリーレン"],
        year: 2023,
        posterUrl: null,
      }),
    ]);
  });

  it("exige sesión", async () => {
    const res = await app.request("/api/search?q=dune");
    expect(res.status).toBe(401);
    expect(tmdb.search).not.toHaveBeenCalled();
  });

  it("valida la consulta", async () => {
    const cookie = await signedInCookie(app, db);
    const res = await app.request("/api/search?q=%20%20", { headers: { cookie } });
    expect(res.status).toBe(400);
    expect(apiErrorSchema.parse(await res.json()).error).toMatchObject({
      code: "INVALID_REQUEST",
      message: "Escribe algo para buscar",
    });
  });

  it("devuelve resultados de ambos catálogos según el contrato, con el anime deduplicado", async () => {
    const cookie = await signedInCookie(app, db);
    const res = await app.request("/api/search?q=frieren", { headers: { cookie } });
    expect(res.status).toBe(200);

    const body = searchResponseSchema.parse(await res.json());
    expect(body.sources).toEqual({ tmdb: "ok", anilist: "ok" });
    expect(body.results.map((r) => r.externalId)).toEqual(["154587", "movie:1"]);
    expect(body.results[0]).toMatchObject({ source: "ANILIST", tmdbId: 209867 });
    // Campos internos del proveedor no salen en la respuesta.
    expect(body.results[0]).not.toHaveProperty("altTitles");
  });

  it("con type=movie solo consulta TMDB", async () => {
    const cookie = await signedInCookie(app, db);
    const res = await app.request("/api/search?q=dune&type=movie", { headers: { cookie } });
    const body = searchResponseSchema.parse(await res.json());
    expect(body.sources.anilist).toBe("skipped");
    expect(anilist.search).not.toHaveBeenCalled();
    expect(tmdb.search).toHaveBeenCalledWith("dune", expect.objectContaining({ type: "MOVIE" }));
  });

  it("cachea las respuestas completas (misma búsqueda sin acentos ni mayúsculas)", async () => {
    const cookie = await signedInCookie(app, db);
    await app.request("/api/search?q=Amélie", { headers: { cookie } });
    const res = await app.request("/api/search?q=amelie", { headers: { cookie } });
    expect(tmdb.search).toHaveBeenCalledTimes(1);
    expect(searchResponseSchema.parse(await res.json()).query).toBe("amelie");
  });

  it("si un proveedor falla, responde con lo del otro y no cachea", async () => {
    anilist.search.mockRejectedValue(new ProviderError("ANILIST", 429, "AniList respondió 429"));
    const cookie = await signedInCookie(app, db);

    const first = searchResponseSchema.parse(
      await (await app.request("/api/search?q=parcial", { headers: { cookie } })).json(),
    );
    expect(first.sources).toEqual({ tmdb: "ok", anilist: "error" });
    expect(first.results.some((r) => r.externalId === "tv:209867")).toBe(true);

    await app.request("/api/search?q=parcial", { headers: { cookie } });
    expect(tmdb.search).toHaveBeenCalledTimes(2);
  });

  it("si fallan todos, responde 502 sin filtrar detalles del proveedor", async () => {
    tmdb.search.mockRejectedValue(new ProviderError("TMDB", 401, "TMDB respondió 401"));
    anilist.search.mockRejectedValue(new ProviderError("ANILIST", 500, "AniList respondió 500"));
    const cookie = await signedInCookie(app, db);
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const res = await app.request("/api/search?q=caido", { headers: { cookie } });
    expect(res.status).toBe(502);
    const { error } = apiErrorSchema.parse(await res.json());
    expect(error.code).toBe("SEARCH_UNAVAILABLE");
    expect(error.message).not.toMatch(/TMDB|401/);
  });
});

describe("GET /api/search sin token de TMDB", () => {
  const { app, db } = setupTestApp({}, { anilist });

  it("busca solo en AniList e indica que TMDB está desactivado", async () => {
    anilist.search.mockResolvedValue([]);
    const cookie = await signedInCookie(app, db);
    const body = searchResponseSchema.parse(
      await (await app.request("/api/search?q=solo-anime", { headers: { cookie } })).json(),
    );
    expect(body.sources).toEqual({ tmdb: "disabled", anilist: "ok" });
  });
});
