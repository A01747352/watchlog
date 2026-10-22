/**
 * Servidor falso de TMDB y AniList para los E2E: la CI nunca llama a las APIs reales.
 * Sirve las mismas fixtures (respuestas reales recortadas) que los tests de packages/providers.
 *   TMDB:    http://localhost:PORT/tmdb/3/...
 *   AniList: http://localhost:PORT/anilist   (POST GraphQL)
 */
import { readFileSync } from "node:fs";
import { createServer } from "node:http";

const port = Number(process.env.MOCK_PROVIDERS_PORT ?? 3999);
const fixturesDir = new URL("../../../../packages/providers/tests/fixtures/", import.meta.url);
const fixture = (name) => readFileSync(new URL(`${name}.json`, fixturesDir), "utf8");

const tmdbSearch = { frieren: "tmdb-search-frieren", dune: "tmdb-search-dune" };
const tmdbDetails = { "/tmdb/3/movie/438631": "tmdb-movie-438631", "/tmdb/3/tv/95396": "tmdb-tv-95396" };

function send(res, status, body) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(body);
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${port}`);

  if (req.method === "GET" && url.pathname === "/health") return send(res, 200, '{"ok":true}');

  if (req.method === "GET" && url.pathname === "/tmdb/3/search/multi") {
    const name = tmdbSearch[(url.searchParams.get("query") ?? "").toLowerCase()];
    return send(res, 200, name ? fixture(name) : '{"page":1,"results":[]}');
  }
  if (req.method === "GET" && tmdbDetails[url.pathname])
    return send(res, 200, fixture(tmdbDetails[url.pathname]));
  if (req.method === "GET" && url.pathname.startsWith("/tmdb/")) return send(res, 404, '{"status_code":34}');

  if (req.method === "POST" && url.pathname === "/anilist") {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      const { query, variables } = JSON.parse(raw);
      if (query.includes("query Search")) {
        return String(variables.search).toLowerCase() === "frieren"
          ? send(res, 200, fixture("anilist-search-frieren"))
          : send(res, 200, '{"data":{"Page":{"media":[]}}}');
      }
      if (variables.id !== 154587) {
        return send(res, 404, '{"data":{"Media":null},"errors":[{"message":"Not Found.","status":404}]}');
      }
      return send(
        res,
        200,
        fixture(query.includes("query Details") ? "anilist-media-154587" : "anilist-recommendations-154587"),
      );
    });
    return;
  }

  send(res, 404, '{"error":"mock: ruta desconocida"}');
});

server.listen(port, () => console.log(`proveedores falsos en http://localhost:${port}`));
