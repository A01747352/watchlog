import {
  addToLibraryResponseSchema,
  apiErrorSchema,
  libraryEntryResponseSchema,
  libraryTagsResponseSchema,
  searchResponseSchema,
} from "@watchlog/contracts";
import { type MediaProvider, ProviderError, type ProviderTitle } from "@watchlog/providers";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { jsonRequest, setupTestApp, signedInCookie, WEB_ORIGIN } from "./support/app";

function title(overrides: Partial<ProviderTitle> = {}): ProviderTitle {
  return {
    source: "TMDB",
    externalId: "movie:438631",
    tmdbId: 438631,
    type: "MOVIE",
    title: "Dune",
    originalTitle: null,
    year: 2021,
    posterPath: "/dune.jpg",
    backdropPath: null,
    overview: "Arena.",
    genres: ["Ciencia ficción"],
    tags: [],
    people: ["Denis Villeneuve"],
    runtimeMin: 155,
    episodes: null,
    seasons: null,
    raw: { id: 438631 },
    ...overrides,
  };
}

const frieren = title({
  source: "ANILIST",
  externalId: "154587",
  tmdbId: null,
  type: "ANIME",
  title: "Frieren: Beyond Journey’s End",
  posterPath: "https://s4.anilist.co/frieren.jpg",
  episodes: 28,
  runtimeMin: 24,
});

const catalog = new Map([
  ["movie:438631", title()],
  ["154587", frieren],
]);

function fakeProvider(source: "TMDB" | "ANILIST") {
  return {
    source,
    search: vi.fn(async () => []),
    getDetails: vi.fn(async (id: string) => {
      const found = catalog.get(id);
      return found?.source === source ? found : null;
    }),
    getRecommendations: vi.fn(async () => []),
  } satisfies MediaProvider;
}

const tmdb = fakeProvider("TMDB");
const anilist = fakeProvider("ANILIST");

const request = (method: string, body?: unknown, cookie = "") => ({
  method,
  headers: { "content-type": "application/json", origin: WEB_ORIGIN, cookie },
  ...(body !== undefined && { body: JSON.stringify(body) }),
});

describe("biblioteca", () => {
  const { app, db } = setupTestApp({}, { tmdb, anilist });
  let cookie: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    cookie = await signedInCookie(app, db);
  });

  async function add(body: Record<string, unknown>) {
    const res = await app.request("/api/library", jsonRequest(body, cookie));
    return { res, body: addToLibraryResponseSchema.parse(await res.json()) };
  }

  describe("POST /api/library", () => {
    it("exige sesión y valida el cuerpo", async () => {
      expect(
        (
          await app.request(
            "/api/library",
            jsonRequest({ source: "TMDB", externalId: "movie:1", status: "PLANNED" }),
          )
        ).status,
      ).toBe(401);

      const res = await app.request("/api/library", jsonRequest({ source: "TMDB", status: "VISTO" }, cookie));
      expect(res.status).toBe(400);
      expect(apiErrorSchema.parse(await res.json()).error.code).toBe("INVALID_REQUEST");
    });

    it("Pendiente: guarda el título en la caché local y crea la entrada sin visionados", async () => {
      const { res, body } = await add({ source: "TMDB", externalId: "movie:438631", status: "PLANNED" });

      expect(res.status).toBe(201);
      expect(body.created).toBe(true);
      expect(body.entry).toMatchObject({
        status: "PLANNED",
        rating: null,
        viewings: [],
        finishedAt: null,
        title: { title: "Dune", type: "MOVIE", posterUrl: "https://image.tmdb.org/t/p/w342/dune.jpg" },
      });
      const stored = await db.title.findUniqueOrThrow({
        where: { source_externalId: { source: "TMDB", externalId: "movie:438631" } },
      });
      expect(stored).toMatchObject({ people: ["Denis Villeneuve"], runtimeMin: 155 });
    });

    it("Visto: marca Terminado y registra el visionado de hoy", async () => {
      const { body } = await add({ source: "TMDB", externalId: "movie:438631", status: "COMPLETED" });
      const today = new Date().toISOString().slice(0, 10);
      expect(body.entry.status).toBe("COMPLETED");
      expect(body.entry.viewings).toEqual([{ id: expect.any(String), watchedOn: today, note: null }]);
      expect(body.entry.finishedAt).not.toBeNull();
    });

    it("si ya está en la biblioteca la devuelve sin duplicarla ni volver a pedir la ficha", async () => {
      await add({ source: "TMDB", externalId: "movie:438631", status: "PLANNED" });
      const { res, body } = await add({ source: "TMDB", externalId: "movie:438631", status: "COMPLETED" });

      expect(res.status).toBe(200);
      expect(body).toMatchObject({ created: false, entry: { status: "PLANNED" } });
      expect(tmdb.getDetails).toHaveBeenCalledTimes(1);
      expect(await db.libraryEntry.count()).toBe(1);
    });

    it("guarda la referencia cruzada a TMDB del anime de AniList", async () => {
      await add({ source: "ANILIST", externalId: "154587", tmdbId: 209867, status: "PLANNED" });
      const stored = await db.title.findUniqueOrThrow({
        where: { source_externalId: { source: "ANILIST", externalId: "154587" } },
      });
      expect(stored.tmdbId).toBe(209867);
    });

    it("404 si el título no existe en el proveedor; 502 si el proveedor falla", async () => {
      const missing = await app.request(
        "/api/library",
        jsonRequest({ source: "TMDB", externalId: "movie:1", status: "PLANNED" }, cookie),
      );
      expect(missing.status).toBe(404);
      expect(apiErrorSchema.parse(await missing.json()).error.code).toBe("TITLE_NOT_FOUND");

      tmdb.getDetails.mockRejectedValueOnce(new ProviderError("TMDB", 503, "TMDB respondió 503"));
      const down = await app.request(
        "/api/library",
        jsonRequest({ source: "TMDB", externalId: "movie:2", status: "PLANNED" }, cookie),
      );
      expect(down.status).toBe(502);
      expect(apiErrorSchema.parse(await down.json()).error.code).toBe("PROVIDER_UNAVAILABLE");
    });
  });

  describe("PATCH /api/library/:id", () => {
    async function patch(id: string, body: unknown) {
      return app.request(`/api/library/${id}`, request("PATCH", body, cookie));
    }

    it("califica con medios puntos, reseña, spoilers y etiquetas (sin duplicados)", async () => {
      const { body } = await add({ source: "TMDB", externalId: "movie:438631", status: "COMPLETED" });
      const res = await patch(body.entry.id, {
        rating: 8.5,
        review: "  Arena y silencio.  ",
        reviewSpoilers: true,
        userTags: ["Banda sonora", "Lloré", "Banda sonora"],
      });

      expect(res.status).toBe(200);
      const { entry } = libraryEntryResponseSchema.parse(await res.json());
      expect(entry).toMatchObject({
        rating: 8.5,
        review: "Arena y silencio.",
        reviewSpoilers: true,
        userTags: ["Banda sonora", "Lloré"],
      });
    });

    it.each([
      [{ rating: 8.3 }, "La nota va en pasos de 0.5"],
      [{ rating: 11 }, "La nota máxima es 10"],
      [{ review: "x".repeat(281) }, "Máximo 280 caracteres"],
      [{}, "No hay nada que actualizar"],
    ])("rechaza %j", async (body, message) => {
      const { body: added } = await add({ source: "TMDB", externalId: "movie:438631", status: "COMPLETED" });
      const res = await patch(added.entry.id, body);
      expect(res.status).toBe(400);
      expect(apiErrorSchema.parse(await res.json()).error.message).toBe(message);
    });

    it("borra la nota y la reseña con null", async () => {
      const { body } = await add({ source: "TMDB", externalId: "movie:438631", status: "COMPLETED" });
      await patch(body.entry.id, { rating: 9, review: "Bien" });
      const { entry } = libraryEntryResponseSchema.parse(
        await (await patch(body.entry.id, { rating: null, review: null })).json(),
      );
      expect(entry).toMatchObject({ rating: null, review: null });
    });

    it("progreso: el primer episodio pasa a Viendo y el último a Terminado", async () => {
      const { body } = await add({ source: "ANILIST", externalId: "154587", status: "PLANNED" });

      const watching = libraryEntryResponseSchema.parse(
        await (await patch(body.entry.id, { currentEpisode: 1 })).json(),
      );
      expect(watching.entry).toMatchObject({ status: "WATCHING", currentEpisode: 1 });
      expect(watching.entry.startedAt).not.toBeNull();

      const done = libraryEntryResponseSchema.parse(
        await (await patch(body.entry.id, { currentEpisode: 28 })).json(),
      );
      expect(done.entry).toMatchObject({ status: "COMPLETED", currentEpisode: 28 });
      expect(done.entry.finishedAt).not.toBeNull();
    });

    it("watchedOn cambia la fecha del último visionado", async () => {
      const { body } = await add({ source: "TMDB", externalId: "movie:438631", status: "COMPLETED" });
      const { entry } = libraryEntryResponseSchema.parse(
        await (await patch(body.entry.id, { watchedOn: "2026-10-01" })).json(),
      );
      expect(entry.viewings.map((v) => v.watchedOn)).toEqual(["2026-10-01"]);
    });

    it("no deja tocar entradas de otra persona", async () => {
      const { body } = await add({ source: "TMDB", externalId: "movie:438631", status: "PLANNED" });
      const other = await signedInCookie(app, db, {
        name: "Bea",
        email: "bea@example.com",
        password: "contraseña-segura",
      });

      const res = await app.request(`/api/library/${body.entry.id}`, request("PATCH", { rating: 1 }, other));
      expect(res.status).toBe(404);
      expect(apiErrorSchema.parse(await res.json()).error.code).toBe("ENTRY_NOT_FOUND");
    });
  });

  describe("re-visionados, borrado y etiquetas", () => {
    it("POST /:id/viewings registra un re-visionado y marca Terminado", async () => {
      const { body } = await add({ source: "TMDB", externalId: "movie:438631", status: "COMPLETED" });
      const res = await app.request(
        `/api/library/${body.entry.id}/viewings`,
        jsonRequest({ watchedOn: "2020-01-15", note: "En el cine" }, cookie),
      );

      expect(res.status).toBe(201);
      const { entry } = libraryEntryResponseSchema.parse(await res.json());
      expect(entry.viewings).toHaveLength(2);
      // Ordenados del más reciente al más antiguo: el de 2020 va después del de hoy.
      expect(entry.viewings.at(-1)).toMatchObject({ watchedOn: "2020-01-15", note: "En el cine" });
    });

    it("DELETE elimina la entrada (Deshacer) y la búsqueda deja de marcarla", async () => {
      const { body } = await add({ source: "TMDB", externalId: "movie:438631", status: "PLANNED" });
      const res = await app.request(`/api/library/${body.entry.id}`, request("DELETE", undefined, cookie));
      expect(res.status).toBe(204);
      expect((await app.request(`/api/library/${body.entry.id}`, { headers: { cookie } })).status).toBe(404);
    });

    it("GET /tags devuelve las etiquetas propias, de más a menos usadas", async () => {
      const a = await add({ source: "TMDB", externalId: "movie:438631", status: "COMPLETED" });
      const b = await add({ source: "ANILIST", externalId: "154587", status: "COMPLETED" });
      await app.request(
        `/api/library/${a.body.entry.id}`,
        request("PATCH", { userTags: ["Lloré", "Banda sonora"] }, cookie),
      );
      await app.request(`/api/library/${b.body.entry.id}`, request("PATCH", { userTags: ["Lloré"] }, cookie));

      const res = await app.request("/api/library/tags", { headers: { cookie } });
      expect(libraryTagsResponseSchema.parse(await res.json()).tags).toEqual(["Lloré", "Banda sonora"]);
    });
  });

  it("la búsqueda marca los títulos que ya están en la biblioteca del usuario", async () => {
    tmdb.search.mockResolvedValue([
      {
        source: "TMDB",
        externalId: "movie:438631",
        tmdbId: 438631,
        type: "MOVIE",
        title: "Dune",
        originalTitle: null,
        altTitles: ["Dune"],
        year: 2021,
        posterUrl: null,
        overview: null,
        popularity: 0.7,
        animeCandidate: false,
      },
    ] as never);
    const { body } = await add({ source: "TMDB", externalId: "movie:438631", status: "COMPLETED" });

    const res = await app.request("/api/search?q=dune&type=movie", { headers: { cookie } });
    const search = searchResponseSchema.parse(await res.json());
    expect(search.results[0]!.library).toEqual({ entryId: body.entry.id, status: "COMPLETED" });
  });
});
