import { describe, expect, it } from "vitest";

import { parseEnv } from "../src/env";

const required = {
  DATABASE_URL: "postgresql://watchlog:watchlog@localhost:5432/watchlog",
  BETTER_AUTH_SECRET: "x".repeat(32),
  BETTER_AUTH_URL: "http://localhost:3000",
};

describe("parseEnv", () => {
  it("aplica valores por defecto", () => {
    expect(parseEnv(required)).toMatchObject({ NODE_ENV: "development", PORT: 3001 });
  });

  it("convierte PORT a número", () => {
    expect(parseEnv({ ...required, PORT: "8080" }).PORT).toBe(8080);
  });

  it("falla diciendo qué variable es inválida", () => {
    expect(() => parseEnv({ ...required, PORT: "no-es-un-puerto" })).toThrow(/PORT/);
  });

  it("exige DATABASE_URL de Postgres y un secreto largo", () => {
    expect(() => parseEnv({ ...required, DATABASE_URL: "mysql://localhost/x" })).toThrow(/DATABASE_URL/);
    expect(() => parseEnv({ ...required, BETTER_AUTH_SECRET: "corto" })).toThrow(/BETTER_AUTH_SECRET/);
  });

  it("trata las variables vacías de OAuth como no definidas", () => {
    const env = parseEnv({ ...required, GITHUB_CLIENT_ID: "", GITHUB_CLIENT_SECRET: "" });
    expect(env.GITHUB_CLIENT_ID).toBeUndefined();
  });

  it("exige las dos credenciales de un proveedor OAuth juntas", () => {
    expect(() => parseEnv({ ...required, GOOGLE_CLIENT_ID: "id" })).toThrow(/GOOGLE_CLIENT_SECRET/);
  });
});
