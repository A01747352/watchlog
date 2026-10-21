import { type HealthResponse } from "@watchlog/contracts";
import { Hono } from "hono";

import { version } from "../version";

/** `GET /health`: comprobación de vida para Docker y monitoreo, incluida la base de datos. */
export function healthRoute(checkDatabase: () => Promise<boolean>) {
  return new Hono().get("/", async (c) => {
    const databaseUp = await checkDatabase().catch(() => false);
    const body: HealthResponse = {
      status: databaseUp ? "ok" : "degraded",
      service: "api",
      version,
      database: databaseUp ? "up" : "down",
      uptimeSeconds: process.uptime(),
      timestamp: new Date().toISOString(),
    };
    return c.json(body, databaseUp ? 200 : 503);
  });
}
