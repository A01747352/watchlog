import type { ApiError } from "@watchlog/contracts";
import type { DbClient } from "@watchlog/db";
import { Hono } from "hono";
import { logger } from "hono/logger";

import { type Auth, enabledSocialProviders } from "./auth";
import type { Env } from "./env";
import { healthRoute } from "./routes/health";
import { invitesRoute } from "./routes/invites";
import { libraryRoute } from "./routes/library";
import { type SearchProviders, searchRoute } from "./routes/search";
import { sessionRoutes } from "./routes/session";

export type AppDeps = {
  db: DbClient;
  auth: Auth;
  env: Pick<
    Env,
    | "NODE_ENV"
    | "BETTER_AUTH_URL"
    | "GITHUB_CLIENT_ID"
    | "GITHUB_CLIENT_SECRET"
    | "GOOGLE_CLIENT_ID"
    | "GOOGLE_CLIENT_SECRET"
  >;
  /** TMDB es opcional (sin token, la búsqueda usa solo AniList). */
  providers: SearchProviders;
  log?: boolean;
};

/**
 * La API vive bajo /api (web reenvía /api/* aquí con un rewrite); /health queda en la raíz
 * para Docker y monitoreo.
 */
export function createApp({ db, auth, env, providers, log = true }: AppDeps) {
  const app = new Hono();
  if (log) app.use(logger());

  app.onError((error, c) => {
    console.error(error);
    return c.json<ApiError>({ error: { code: "INTERNAL", message: "Error interno del servidor." } }, 500);
  });
  app.notFound((c) =>
    c.json<ApiError>({ error: { code: "NOT_FOUND", message: "Ruta no encontrada." } }, 404),
  );

  const api = new Hono()
    .on(["GET", "POST"], "/auth/*", (c) => auth.handler(c.req.raw))
    .route("/invites", invitesRoute({ db, auth, secureCookies: env.BETTER_AUTH_URL.startsWith("https://") }))
    .route("/search", searchRoute({ db, auth, providers }))
    .route("/library", libraryRoute({ db, auth, providers }))
    .route("/", sessionRoutes({ auth, providers: enabledSocialProviders(env) }));

  return app
    .route(
      "/health",
      healthRoute(() => db.$queryRaw`SELECT 1`.then(() => true)),
    )
    .route("/api", api);
}
