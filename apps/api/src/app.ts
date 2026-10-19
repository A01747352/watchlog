import { Hono } from "hono";
import { logger } from "hono/logger";

import { healthRoute } from "./routes/health";

export function createApp({ log = true }: { log?: boolean } = {}) {
  const app = new Hono();
  if (log) app.use(logger());

  return app.route("/health", healthRoute);
}

/** Tipo de la app para el cliente RPC de apps/web (Fase 2). */
export type AppType = ReturnType<typeof createApp>;
