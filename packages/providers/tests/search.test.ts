import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import {
  ANILIST_API_URL,
  createAniListProvider,
  createTmdbProvider,
  dedupeAnime,
  matchScore,
  rankResults,
  type ProviderSearchItem,
  TMDB_API_URL,
  unifiedSearch,
} from "../src";
import { anilistPopularity, tmdbPopularity } from "../src/popularity";
import { server } from "./msw";

const tmdb = createTmdbProvider({ token: "test-token", retries: 0 });
const anilist = createAniListProvider({ retries: 0 });
const providers = { tmdb, anilist };

function item(overrides: Partial<ProviderSearchItem>): ProviderSearchItem {
  return {
    source: "TMDB",
    externalId: "tv:1",
    tmdbId: 1,
    type: "SERIES",
    title: "Título",
    originalTitle: null,
    altTitles: [overrides.title ?? "Título"],
    year: 2020,
    posterUrl: null,
    overview: null,
    popularity: 0.5,
    animeCandidate: false,
    ...overrides,
  };
}

describe("unifiedSearch", () => {
  it("muestra la versión de AniList del anime y guarda el id de TMDB como referencia", async () => {
    const { items, sources } = await unifiedSearch(providers, "frieren");

    expect(sources).toEqual({ tmdb: "ok", anilist: "ok" });
    expect(items.some((i) => i.externalId === "tv:209867")).toBe(false);
    const frieren = items.find((i) => i.externalId === "154587")!;
    expect(frieren).toMatchObject({ source: "ANILIST", tmdbId: 209867 });
    // La referencia cruzada va solo a la primera temporada (misma fecha), no a las siguientes.
    expect(items.filter((i) => i.tmdbId === 209867)).toHaveLength(1);
    // Lo que no es anime se mantiene.
    expect(items.some((i) => i.externalId === "movie:360097")).toBe(true);
  });

  it("ordena primero los títulos que coinciden mejor con la búsqueda", async () => {
    const { items } = await unifiedSearch(providers, "frieren");
    expect(items[0]!.title).toBe("Frieren: Beyond Journey’s End");

    const dune = await unifiedSearch(providers, "dune");
    expect(dune.items.slice(0, 2).map((i) => i.externalId)).toEqual(["movie:438631", "movie:841"]);
  });

  it("con filtro de película no consulta AniList", async () => {
    const { items, sources } = await unifiedSearch(providers, "dune", { type: "MOVIE" });
    expect(sources).toEqual({ tmdb: "ok", anilist: "skipped" });
    expect(items.every((i) => i.type === "MOVIE")).toBe(true);
  });

  it("si AniList falla, devuelve lo de TMDB e indica el fallo", async () => {
    server.use(http.post(ANILIST_API_URL, () => new HttpResponse(null, { status: 500 })));
    const { items, sources } = await unifiedSearch(providers, "frieren");
    expect(sources).toEqual({ tmdb: "ok", anilist: "error" });
    // Sin pareja en AniList, el anime de TMDB se queda (como anime).
    expect(items.find((i) => i.externalId === "tv:209867")).toMatchObject({ type: "ANIME" });
  });

  it("si fallan todos los proveedores, lanza el error", async () => {
    server.use(
      http.post(ANILIST_API_URL, () => new HttpResponse(null, { status: 500 })),
      http.get(`${TMDB_API_URL}/search/multi`, () => new HttpResponse(null, { status: 500 })),
    );
    await expect(unifiedSearch(providers, "frieren")).rejects.toMatchObject({ name: "ProviderError" });
  });

  it("sin token de TMDB funciona solo con AniList", async () => {
    const { items, sources } = await unifiedSearch({ anilist }, "frieren");
    expect(sources).toEqual({ tmdb: "disabled", anilist: "ok" });
    expect(items.every((i) => i.source === "ANILIST")).toBe(true);
  });

  it("respeta el límite", async () => {
    const { items } = await unifiedSearch(providers, "frieren", { limit: 3 });
    expect(items).toHaveLength(3);
  });
});

describe("dedupeAnime", () => {
  const tmdbAnime = item({
    externalId: "tv:5",
    tmdbId: 5,
    type: "ANIME",
    animeCandidate: true,
    title: "Mononoke",
    year: 2007,
  });

  it("no empareja si el año difiere más de uno", () => {
    const anime = item({
      source: "ANILIST",
      externalId: "1",
      tmdbId: null,
      type: "ANIME",
      title: "Mononoke",
      year: 1997,
    });
    const result = dedupeAnime([tmdbAnime], [anime]);
    expect(result.tmdb).toHaveLength(1);
    expect(result.anilist[0]!.tmdbId).toBeNull();
  });

  it("compara títulos sin acentos, mayúsculas ni puntuación", () => {
    const anime = item({
      source: "ANILIST",
      externalId: "1",
      tmdbId: null,
      type: "ANIME",
      title: "mononoké!",
      year: 2008,
    });
    expect(dedupeAnime([tmdbAnime], [anime]).anilist[0]!.tmdbId).toBe(5);
  });

  it("no modifica los resultados de entrada", () => {
    const anime = item({
      source: "ANILIST",
      externalId: "1",
      tmdbId: null,
      type: "ANIME",
      title: "Mononoke",
      year: 2007,
    });
    dedupeAnime([tmdbAnime], [anime]);
    expect(anime.tmdbId).toBeNull();
  });
});

describe("matchScore", () => {
  it.each([
    ["Dune", 3],
    ["Dune: Parte dos", 2],
    ["Hijos de Dune", 1],
    ["Anatomía de una caída", 0],
  ])("%s → %i", (title, score) => {
    expect(matchScore(item({ title, altTitles: [title] }), "dune")).toBe(score);
  });
});

describe("rankResults", () => {
  // Casos reales encontrados en la prueba contra TMDB y AniList.
  it("a igual coincidencia, gana el título más popular aunque venga de otro catálogo", () => {
    const duneAnime = item({
      source: "ANILIST",
      externalId: "1",
      type: "ANIME",
      title: "DUNE",
      popularity: anilistPopularity(3_699),
    });
    const duneMovie = item({ externalId: "movie:438631", title: "Dune", popularity: tmdbPopularity(47.7) });
    const ranked = rankResults([[duneMovie], [duneAnime]], "dune");
    expect(ranked.map((i) => i.externalId)).toEqual(["movie:438631", "1"]);
  });

  it("un título exacto pero desconocido no tapa a un éxito con el mismo nombre", () => {
    const obscure = item({
      externalId: "movie:9",
      title: "Your Name",
      year: null,
      popularity: tmdbPopularity(2.43),
    });
    const kiminonawa = item({
      source: "ANILIST",
      externalId: "21519",
      type: "ANIME",
      title: "Your Name.",
      popularity: anilistPopularity(723_566),
    });
    expect(rankResults([[obscure], [kiminonawa]], "your name")[0]!.externalId).toBe("21519");
  });

  it("la coincidencia con la búsqueda pesa más que la popularidad", () => {
    const exact = item({ externalId: "movie:1", title: "Dune", popularity: 0.1 });
    const partial = item({ externalId: "movie:2", title: "Dune: Parte dos", popularity: 1 });
    expect(rankResults([[partial, exact]], "dune")[0]!.externalId).toBe("movie:1");
  });
});

describe("popularidad normalizada", () => {
  it("calibra cada catálogo entre nicho (0) y éxito (1)", () => {
    expect(tmdbPopularity(null)).toBe(0);
    expect(tmdbPopularity(0.5)).toBe(0);
    expect(tmdbPopularity(47.7)).toBeCloseTo(0.73, 2);
    expect(tmdbPopularity(5000)).toBe(1);
    expect(anilistPopularity(3_699)).toBeCloseTo(0.19, 2);
    expect(anilistPopularity(492_119)).toBeCloseTo(0.9, 2);
  });
});
