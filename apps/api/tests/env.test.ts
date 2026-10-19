import { describe, expect, it } from "vitest";

import { parseEnv } from "../src/env";

describe("parseEnv", () => {
  it("aplica valores por defecto", () => {
    expect(parseEnv({})).toEqual({ NODE_ENV: "development", PORT: 3001 });
  });

  it("convierte PORT a número", () => {
    expect(parseEnv({ PORT: "8080", NODE_ENV: "production" }).PORT).toBe(8080);
  });

  it("falla diciendo qué variable es inválida", () => {
    expect(() => parseEnv({ PORT: "no-es-un-puerto" })).toThrow(/PORT/);
  });
});
