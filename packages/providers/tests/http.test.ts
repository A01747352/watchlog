import { describe, expect, it, vi } from "vitest";

import { createHttpClient, parseRetryAfter, ProviderError } from "../src";

function client(responses: Array<Response | Error>, retries = 3) {
  const fetch = vi.fn<typeof globalThis.fetch>();
  for (const response of responses) {
    if (response instanceof Error) fetch.mockRejectedValueOnce(response);
    else fetch.mockResolvedValueOnce(response);
  }
  const delays: number[] = [];
  const sleep = vi.fn(async (ms: number) => void delays.push(ms));
  return {
    request: createHttpClient({ source: "TMDB", fetch, sleep, retries, baseDelayMs: 100 }),
    fetch,
    delays,
  };
}

describe("createHttpClient", () => {
  it("ante 429 espera lo que dice Retry-After y reintenta", async () => {
    const { request, fetch, delays } = client([
      new Response(null, { status: 429, headers: { "retry-after": "2" } }),
      new Response("ok"),
    ]);
    const res = await request("https://example.test");
    expect(await res.text()).toBe("ok");
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(delays).toEqual([2000]);
  });

  it("reintenta errores 5xx y de red con backoff creciente", async () => {
    const { request, fetch, delays } = client([
      new Response(null, { status: 503 }),
      new TypeError("fetch failed"),
      new Response("ok"),
    ]);
    await request("https://example.test");
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(delays).toHaveLength(2);
    expect(delays[1]!).toBeGreaterThanOrEqual(100); // 2.º intento: 200ms ± jitter (mín. 100)
  });

  it("no reintenta errores 4xx que no son 429", async () => {
    const { request, fetch } = client([new Response(null, { status: 404 })]);
    await expect(request("https://example.test")).rejects.toMatchObject({ status: 404, source: "TMDB" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("se rinde tras agotar los reintentos", async () => {
    const { request, fetch } = client(
      Array.from({ length: 3 }, () => new Response(null, { status: 500 })),
      2,
    );
    const error = await request("https://example.test").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ProviderError);
    expect(error).toMatchObject({ status: 500 });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("no espera más que maxDelayMs aunque Retry-After pida más", async () => {
    const { request, delays } = client([
      new Response(null, { status: 429, headers: { "retry-after": "3600" } }),
      new Response("ok"),
    ]);
    await request("https://example.test");
    expect(delays).toEqual([10_000]);
  });
});

describe("parseRetryAfter", () => {
  it("acepta segundos y fechas HTTP", () => {
    expect(parseRetryAfter("5")).toBe(5000);
    expect(
      parseRetryAfter("Wed, 21 Oct 2026 07:28:10 GMT", Date.parse("Wed, 21 Oct 2026 07:28:00 GMT")),
    ).toBe(10_000);
    expect(parseRetryAfter(null)).toBeNull();
    expect(parseRetryAfter("pronto")).toBeNull();
  });
});
