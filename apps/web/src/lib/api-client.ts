import { apiErrorSchema, type ApiError } from "@watchlog/contracts";
import type { z } from "zod";

import { apiUrl } from "./api-url";

/**
 * Cliente de la API validado con los esquemas de @watchlog/contracts.
 * En el navegador usa rutas relativas (/api/* se reenvía a la API con un rewrite);
 * en el servidor llama directamente a API_URL y hay que pasarle la cookie de la petición.
 * Por qué contratos y no Hono RPC: docs/adr/0001-cliente-api-con-contratos.md.
 */
export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: ApiError["error"] };

function resolve(path: string) {
  if (typeof window !== "undefined") return path;
  return new URL(path, apiUrl()).toString();
}

export async function apiFetch<Schema extends z.ZodType>(
  path: string,
  schema: Schema,
  { cookie, ...init }: RequestInit & { cookie?: string } = {},
): Promise<ApiResult<z.infer<Schema>>> {
  const headers = new Headers(init.headers);
  if (cookie) headers.set("cookie", cookie);
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");

  let res: Response;
  try {
    res = await fetch(resolve(path), { ...init, headers, cache: "no-store" });
  } catch {
    return {
      ok: false,
      status: 0,
      error: { code: "NETWORK", message: "No se pudo conectar con el servidor." },
    };
  }

  // 204 (p. ej. DELETE) no trae cuerpo: se valida `undefined` (usa `z.undefined()` como esquema).
  const body: unknown = res.status === 204 ? undefined : await res.json().catch(() => null);
  if (!res.ok) {
    const parsed = apiErrorSchema.safeParse(body);
    return {
      ok: false,
      status: res.status,
      error: parsed.success
        ? parsed.data.error
        : { code: "UNKNOWN", message: "Algo salió mal. Inténtalo de nuevo." },
    };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    // La API respondió algo que no cumple el contrato: mejor un error claro que datos a medias.
    console.error(`Respuesta de ${path} fuera de contrato`, parsed.error.issues);
    return {
      ok: false,
      status: res.status,
      error: { code: "INVALID_RESPONSE", message: "Algo salió mal. Inténtalo de nuevo." },
    };
  }
  return { ok: true, data: parsed.data };
}
