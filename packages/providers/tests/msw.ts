import { readFileSync } from "node:fs";

import { http, HttpResponse, type JsonBodyType } from "msw";
import { setupServer } from "msw/node";

import { ANILIST_API_URL, TMDB_API_URL } from "../src";

export const fixture = (name: string): JsonBodyType =>
  JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), "utf8"));

/** Últimas peticiones recibidas, para comprobar cabeceras y parámetros. */
export const requests: Request[] = [];

const tmdbSearch: Record<string, string> = { frieren: "tmdb-search-frieren", dune: "tmdb-search-dune" };

type GraphQLBody = { query: string; variables: Record<string, unknown> };

export const handlers = [
  http.get(`${TMDB_API_URL}/search/multi`, ({ request }) => {
    requests.push(request);
    const query = new URL(request.url).searchParams.get("query") ?? "";
    const name = tmdbSearch[query.toLowerCase()];
    return HttpResponse.json(
      name ? fixture(name) : { page: 1, results: [], total_pages: 0, total_results: 0 },
    );
  }),
  http.get(`${TMDB_API_URL}/movie/438631`, ({ request }) => {
    requests.push(request);
    return HttpResponse.json(fixture("tmdb-movie-438631"));
  }),
  http.get(`${TMDB_API_URL}/tv/95396`, ({ request }) => {
    requests.push(request);
    return HttpResponse.json(fixture("tmdb-tv-95396"));
  }),
  http.get(`${TMDB_API_URL}/movie/438631/recommendations`, () =>
    HttpResponse.json(fixture("tmdb-movie-438631-recommendations")),
  ),
  http.get(`${TMDB_API_URL}/:kind/:id`, () =>
    HttpResponse.json({ success: false, status_code: 34, status_message: "Not found" }, { status: 404 }),
  ),
  http.post(ANILIST_API_URL, async ({ request }) => {
    requests.push(request.clone());
    const { query, variables } = (await request.json()) as GraphQLBody;
    if (query.includes("query Search")) {
      return String(variables.search).toLowerCase() === "frieren"
        ? HttpResponse.json(fixture("anilist-search-frieren"))
        : HttpResponse.json({ data: { Page: { media: [] } } });
    }
    if (variables.id !== 154587) {
      return HttpResponse.json(
        { data: { Media: null }, errors: [{ message: "Not Found.", status: 404 }] },
        { status: 404 },
      );
    }
    return HttpResponse.json(
      fixture(query.includes("query Details") ? "anilist-media-154587" : "anilist-recommendations-154587"),
    );
  }),
];

export const server = setupServer(...handlers);
