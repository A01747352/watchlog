import { describe, expect, it } from "vitest";

import { healthResponseSchema } from "./health";

const valid = {
  status: "ok",
  service: "api",
  version: "0.0.0",
  database: "up",
  uptimeSeconds: 12.5,
  timestamp: "2026-10-19T12:00:00.000Z",
};

describe("healthResponseSchema", () => {
  it("acepta una respuesta válida", () => {
    expect(healthResponseSchema.parse(valid).status).toBe("ok");
  });

  it("acepta el estado degradado con la base de datos caída", () => {
    expect(healthResponseSchema.parse({ ...valid, status: "degraded", database: "down" }).database).toBe(
      "down",
    );
  });

  it("rechaza un estado desconocido", () => {
    expect(healthResponseSchema.safeParse({ ...valid, status: "broken" }).success).toBe(false);
  });
});
