import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import { ANILIST_API_URL, createAniListProvider } from "../src";
import { fixture, requests, server } from "./msw";

const anilist = createAniListProvider({ retries: 0 });

beforeEach(() => {
  requests.length = 0;
});

describe("AniList · search", () => {
  it("pide solo anime no adulto y normaliza los títulos", async () => {
    const results = await anilist.search("frieren", { limit: 5 });
    const body = (await requests[0]!.json()) as { query: string; variables: Record<string, unknown> };
    expect(body.query).toContain("isAdult: false");
    expect(body.variables).toEqual({ search: "frieren", perPage: 5 });

    expect(results[0]).toEqual({
      source: "ANILIST",
      externalId: "154587",
      tmdbId: null,
      type: "ANIME",
      title: "Frieren: Beyond Journey’s End",
      originalTitle: "葬送のフリーレン",
      altTitles: ["Frieren: Beyond Journey’s End", "Sousou no Frieren", "葬送のフリーレン"],
      year: 2023,
      posterUrl: expect.stringMatching(/^https:\/\/s4\.anilist\.co\//),
      overview: expect.stringContaining("elf mage"),
      popularity: expect.any(Number),
      animeCandidate: false,
    });
  });

  it("usa el romaji si no hay título en inglés y limpia el HTML de la sinopsis", async () => {
    const results = await anilist.search("frieren");
    const third = results.find((r) => r.externalId === "209939")!;
    expect(third.title).toBe("Sousou no Frieren 3rd Season");
    expect(results.every((r) => !/<[a-z]/i.test(r.overview ?? ""))).toBe(true);
  });

  it("no consulta AniList si se filtra por películas o series", async () => {
    expect(await anilist.search("frieren", { type: "MOVIE" })).toEqual([]);
    expect(requests).toHaveLength(0);
  });

  it("descarta contenido adulto aunque llegue en la respuesta", async () => {
    const page = fixture("anilist-search-frieren") as {
      data: { Page: { media: Array<{ isAdult: boolean }> } };
    };
    page.data.Page.media[0]!.isAdult = true;
    server.use(http.post(ANILIST_API_URL, () => HttpResponse.json(page)));
    const results = await anilist.search("frieren");
    expect(results.map((r) => r.externalId)).not.toContain("154587");
  });

  it("convierte los errores GraphQL en errores del proveedor", async () => {
    server.use(
      http.post(ANILIST_API_URL, () =>
        HttpResponse.json(
          { data: null, errors: [{ message: "Too Many Requests.", status: 429 }] },
          { status: 429 },
        ),
      ),
    );
    await expect(anilist.search("frieren")).rejects.toMatchObject({ source: "ANILIST", status: 429 });
  });
});

describe("AniList · getDetails", () => {
  it("ficha con estudio, duración por episodio y tags sin spoilers", async () => {
    const media = fixture("anilist-media-154587") as {
      data: {
        Media: { tags: Array<{ name: string; rank: number; isMediaSpoiler: boolean; isAdult: boolean }> };
      };
    };
    media.data.Media.tags.push({ name: "Spoiler", rank: 99, isMediaSpoiler: true, isAdult: false });
    server.use(http.post(ANILIST_API_URL, () => HttpResponse.json(media)));

    const details = await anilist.getDetails("154587");
    expect(details).toMatchObject({
      source: "ANILIST",
      externalId: "154587",
      type: "ANIME",
      title: "Frieren: Beyond Journey’s End",
      year: 2023,
      people: ["MADHOUSE"],
      runtimeMin: 24,
      episodes: 28,
      seasons: null,
    });
    expect(details!.tags).toContain("Elf");
    expect(details!.tags).not.toContain("Spoiler");
    expect(details!.genres.length).toBeGreaterThan(0);
  });

  it("devuelve null si el id no existe o no es válido", async () => {
    expect(await anilist.getDetails("1")).toBeNull();
    expect(await anilist.getDetails("abc")).toBeNull();
  });
});

describe("AniList · getRecommendations", () => {
  it("devuelve las recomendaciones de la comunidad", async () => {
    const recs = await anilist.getRecommendations("154587");
    expect(recs.map((r) => r.title)).toContain("Violet Evergarden");
    expect(recs.every((r) => r.type === "ANIME")).toBe(true);
  });
});
