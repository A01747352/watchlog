import { healthResponseSchema } from "@watchlog/contracts";
import { createDbClient } from "@watchlog/db";
import { describe, expect, it } from "vitest";

import { createApp } from "../src/app";
import { createAuth } from "../src/auth";
import { setupTestApp, testEnv } from "./support/app";

describe("GET /health", () => {
  const { app } = setupTestApp();

  it("responde 200 con la base de datos arriba", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const body = healthResponseSchema.parse(await res.json());
    expect(body).toMatchObject({ status: "ok", database: "up" });
  });

  it("responde 503 si la base de datos no responde", async () => {
    const env = { ...testEnv, DATABASE_URL: "postgresql://nadie:nada@127.0.0.1:1/nada" };
    const db = createDbClient(env.DATABASE_URL);
    const broken = createApp({ db, auth: createAuth({ db, env }), env, log: false });

    const res = await broken.request("/health");
    expect(res.status).toBe(503);
    expect(healthResponseSchema.parse(await res.json())).toMatchObject({
      status: "degraded",
      database: "down",
    });
  });

  it("devuelve 404 con el formato de error de la API en rutas desconocidas", async () => {
    const res = await app.request("/api/nope");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: { code: "NOT_FOUND", message: "Ruta no encontrada." } });
  });
});
