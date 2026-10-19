import { type HealthResponse } from "@watchlog/contracts";
import { Hono } from "hono";

import { version } from "../version";

/** `GET /health`: comprobación de vida para Docker y monitoreo. La Fase 2 añade la base de datos. */
export const healthRoute = new Hono().get("/", (c) => {
  const body: HealthResponse = {
    status: "ok",
    service: "api",
    version,
    uptimeSeconds: process.uptime(),
    timestamp: new Date().toISOString(),
  };
  return c.json(body);
});
