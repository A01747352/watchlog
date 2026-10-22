import { serve } from "@hono/node-server";
import { createDbClient } from "@watchlog/db";
import { createAniListProvider, createTmdbProvider } from "@watchlog/providers";

import { createApp } from "./app";
import { createAuth } from "./auth";
import { parseEnv } from "./env";

const env = parseEnv(process.env);
const db = createDbClient(env.DATABASE_URL);
const auth = createAuth({ db, env });

if (!env.TMDB_READ_TOKEN) {
  console.warn("Falta TMDB_READ_TOKEN: la búsqueda solo usará AniList (sin películas ni series).");
}
const providers = {
  tmdb: env.TMDB_READ_TOKEN
    ? createTmdbProvider({ token: env.TMDB_READ_TOKEN, language: env.TMDB_LANGUAGE })
    : undefined,
  anilist: createAniListProvider(),
};

const app = createApp({ db, auth, env, providers, log: env.NODE_ENV !== "test" });

const server = serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`api escuchando en http://localhost:${info.port}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(() => {
      void db.$disconnect().finally(() => process.exit(0));
    });
  });
}
