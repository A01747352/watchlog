import { healthResponseSchema } from "@watchlog/contracts";
import { describe, expect, it } from "vitest";

import { createApp } from "../src/app";

describe("GET /health", () => {
  const app = createApp({ log: false });

  it("responde 200 con un cuerpo que cumple el contrato", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);

    const body = healthResponseSchema.parse(await res.json());
    expect(body.status).toBe("ok");
    expect(body.service).toBe("api");
  });

  it("devuelve 404 en rutas desconocidas", async () => {
    const res = await app.request("/nope");
    expect(res.status).toBe(404);
  });
});
