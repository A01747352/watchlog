import { authProvidersResponseSchema, type AuthProvidersResponse } from "@watchlog/contracts";

import { apiFetch } from "./api-client";

/** Métodos de acceso activos en la API. Si no responde, solo email y contraseña. Solo en el servidor. */
export async function getAuthProviders(): Promise<AuthProvidersResponse> {
  const result = await apiFetch("/api/auth-providers", authProvidersResponseSchema);
  return result.ok ? result.data : { emailPassword: true, github: false, google: false };
}

/** Solo rutas internas: evita redirecciones abiertas con ?next=https://… o //dominio. */
export function safeNextPath(value: string | string[] | undefined) {
  const next = Array.isArray(value) ? value[0] : value;
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
}
