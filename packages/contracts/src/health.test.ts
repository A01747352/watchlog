import { describe, expect, it } from "vitest";

import { healthResponseSchema } from "./health";

describe("healthResponseSchema", () => {
  it("acepta una respuesta válida", () => {
    const parsed = healthResponseSchema.parse({
      status: "ok",
      service: "api",
      version: "0.0.0",
      uptimeSeconds: 12.5,
      timestamp: "2026-10-19T12:00:00.000Z",
    });
    expect(parsed.status).toBe("ok");
  });

  it("rechaza un estado desconocido", () => {
    const result = healthResponseSchema.safeParse({
      status: "degraded",
      service: "api",
      version: "0.0.0",
      uptimeSeconds: 1,
      timestamp: "2026-10-19T12:00:00.000Z",
    });
    expect(result.success).toBe(false);
  });
});
