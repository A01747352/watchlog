import { describe, expect, it } from "vitest";

import { createTtlCache } from "./ttl-cache";

describe("createTtlCache", () => {
  it("caduca las entradas pasado el TTL", () => {
    let time = 0;
    const cache = createTtlCache<string>({ ttlMs: 1000, maxEntries: 10, now: () => time });
    cache.set("a", "uno");
    time = 999;
    expect(cache.get("a")).toBe("uno");
    time = 1000;
    expect(cache.get("a")).toBeUndefined();
  });

  it("descarta la entrada más antigua al superar el máximo", () => {
    const cache = createTtlCache<number>({ ttlMs: 60_000, maxEntries: 2 });
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("a", 3); // reescribir la renueva
    cache.set("c", 4);
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toBe(3);
    expect(cache.size).toBe(2);
  });
});
