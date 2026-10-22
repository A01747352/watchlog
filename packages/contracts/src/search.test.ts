import { describe, expect, it } from "vitest";

import { searchQuerySchema, searchResultSchema } from "./search";

describe("searchQuerySchema", () => {
  it("recorta la búsqueda y usa 'all' por defecto", () => {
    expect(searchQuerySchema.parse({ q: "  dune " })).toEqual({ q: "dune", type: "all" });
  });

  it.each([{ q: "" }, { q: "   " }, { q: "x".repeat(101) }, { q: "dune", type: "music" }])(
    "rechaza %j",
    (query) => {
      expect(searchQuerySchema.safeParse(query).success).toBe(false);
    },
  );
});

describe("searchResultSchema", () => {
  it("acepta un resultado de AniList con referencia cruzada a TMDB", () => {
    const result = {
      source: "ANILIST",
      externalId: "154587",
      tmdbId: 209867,
      type: "ANIME",
      title: "Frieren: Beyond Journey’s End",
      originalTitle: "葬送のフリーレン",
      year: 2023,
      posterUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/x.jpg",
      overview: null,
      library: { entryId: "e1", status: "COMPLETED" },
    };
    expect(searchResultSchema.parse(result)).toEqual(result);
  });

  it("exige una URL de póster válida o null", () => {
    expect(
      searchResultSchema.safeParse({
        source: "TMDB",
        externalId: "movie:1",
        tmdbId: 1,
        type: "MOVIE",
        title: "x",
        originalTitle: null,
        year: null,
        posterUrl: "/abc.jpg",
        overview: null,
        library: null,
      }).success,
    ).toBe(false);
  });
});
