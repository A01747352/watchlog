import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import { createTmdbProvider, TMDB_API_URL } from "../src";
import { requests, server } from "./msw";

const tmdb = createTmdbProvider({ token: "test-token", retries: 0 });

beforeEach(() => {
  requests.length = 0;
});

describe("TMDB · search", () => {
  it("envía el token, el idioma y excluye contenido adulto", async () => {
    await tmdb.search("dune");
    const request = requests[0]!;
    const url = new URL(request.url);
    expect(request.headers.get("authorization")).toBe("Bearer test-token");
    expect(url.searchParams.get("language")).toBe("es-ES");
    expect(url.searchParams.get("include_adult")).toBe("false");
  });

  it("normaliza películas y series con id por tipo y póster w342", async () => {
    const results = await tmdb.search("dune");
    expect(results[2]).toEqual({
      source: "TMDB",
      externalId: "movie:438631",
      tmdbId: 438631,
      type: "MOVIE",
      title: "Dune",
      originalTitle: null,
      altTitles: ["Dune"],
      year: 2021,
      posterUrl: expect.stringMatching(/^https:\/\/image\.tmdb\.org\/t\/p\/w342\//),
      overview: expect.any(String),
      popularity: expect.any(Number),
      animeCandidate: false,
    });
    expect(results.find((r) => r.externalId === "tv:90228")).toMatchObject({ type: "SERIES", year: 2024 });
  });

  it("marca como anime la animación japonesa", async () => {
    const [frieren] = await tmdb.search("frieren");
    expect(frieren).toMatchObject({
      externalId: "tv:209867",
      type: "ANIME",
      animeCandidate: true,
      originalTitle: "葬送のフリーレン",
    });
  });

  it("filtra por tipo", async () => {
    const movies = await tmdb.search("dune", { type: "MOVIE" });
    expect(movies.length).toBeGreaterThan(0);
    expect(movies.every((r) => r.type === "MOVIE")).toBe(true);
    expect(await tmdb.search("frieren", { type: "SERIES" })).toEqual([]);
  });

  it("descarta personas y contenido adulto aunque la API los devuelva", async () => {
    server.use(
      http.get(`${TMDB_API_URL}/search/multi`, () =>
        HttpResponse.json({
          results: [
            { id: 1, media_type: "person", name: "Denis Villeneuve" },
            { id: 2, media_type: "movie", title: "Adulto", adult: true },
            { id: 3, media_type: "movie", title: "Softcore", adult: false, softcore: true },
            { id: 4, media_type: "movie", title: "Normal", adult: false },
          ],
        }),
      ),
    );
    expect((await tmdb.search("x")).map((r) => r.title)).toEqual(["Normal"]);
  });

  it("falla con un error del proveedor si TMDB rechaza el token", async () => {
    server.use(http.get(`${TMDB_API_URL}/search/multi`, () => new HttpResponse(null, { status: 401 })));
    await expect(tmdb.search("dune")).rejects.toMatchObject({
      name: "ProviderError",
      source: "TMDB",
      status: 401,
    });
  });
});

describe("TMDB · getDetails", () => {
  it("ficha de película: director, géneros, keywords y duración", async () => {
    const movie = await tmdb.getDetails("movie:438631");
    expect(movie).toMatchObject({
      source: "TMDB",
      externalId: "movie:438631",
      tmdbId: 438631,
      type: "MOVIE",
      title: "Dune",
      year: 2021,
      people: ["Denis Villeneuve"],
      runtimeMin: 155,
      episodes: null,
      seasons: null,
    });
    expect(movie!.genres).toContain("Ciencia ficción");
    expect(movie!.tags.length).toBeGreaterThan(0);
    expect(movie!.posterPath).toMatch(/^\/.+\.jpg$/);
    expect(new URL(requests[0]!.url).searchParams.get("append_to_response")).toBe("credits,keywords");
  });

  it("ficha de serie: creadores, episodios y temporadas", async () => {
    const series = await tmdb.getDetails("tv:95396");
    expect(series).toMatchObject({
      type: "SERIES",
      title: "Separación",
      people: ["Dan Erickson"],
      episodes: 19,
      seasons: 3,
    });
  });

  it("devuelve null si no existe o el id no es válido", async () => {
    expect(await tmdb.getDetails("movie:999999999")).toBeNull();
    expect(await tmdb.getDetails("438631")).toBeNull();
  });
});

describe("TMDB · getRecommendations", () => {
  it("devuelve recomendaciones normalizadas", async () => {
    const recs = await tmdb.getRecommendations("movie:438631");
    expect(recs).toHaveLength(3);
    expect(recs.every((r) => r.source === "TMDB" && r.externalId.startsWith("movie:"))).toBe(true);
  });
});
