import { meResponseSchema } from "@watchlog/contracts";

import { apiFetch } from "./api-client";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("apiFetch (navegador)", () => {
  it("valida la respuesta con el esquema del contrato", async () => {
    fetchMock.mockResolvedValue(
      json({ user: { id: "1", name: "Ana", email: "ana@example.com", image: null } }),
    );
    const result = await apiFetch("/api/me", meResponseSchema);

    expect(fetchMock).toHaveBeenCalledWith("/api/me", expect.objectContaining({ cache: "no-store" }));
    expect(result).toEqual({ ok: true, data: { user: expect.objectContaining({ name: "Ana" }) } });
  });

  it("devuelve el error de la API con su código", async () => {
    fetchMock.mockResolvedValue(json({ error: { code: "UNAUTHORIZED", message: "Inicia sesión." } }, 401));
    expect(await apiFetch("/api/me", meResponseSchema)).toEqual({
      ok: false,
      status: 401,
      error: { code: "UNAUTHORIZED", message: "Inicia sesión." },
    });
  });

  it("convierte un fallo de red en un error legible", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    const result = await apiFetch("/api/me", meResponseSchema);
    expect(result).toMatchObject({ ok: false, status: 0, error: { code: "NETWORK" } });
  });

  it("añade content-type JSON cuando hay cuerpo", async () => {
    fetchMock.mockResolvedValue(json({ user: { id: "1", name: "A", email: "a@example.com", image: null } }));
    await apiFetch("/api/me", meResponseSchema, { method: "POST", body: "{}" });
    const headers = fetchMock.mock.calls[0]![1]!.headers as Headers;
    expect(headers.get("content-type")).toBe("application/json");
  });
});
