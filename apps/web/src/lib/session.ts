import { meResponseSchema, type SessionUser } from "@watchlog/contracts";
import { cookies } from "next/headers";
import { cache } from "react";

import { apiFetch } from "./api-client";

/**
 * Usuario de la sesión actual, consultado a la API (fuente de verdad). Solo en el servidor.
 * `proxy.ts` hace una comprobación optimista por cookie; esta es la definitiva.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const cookie = (await cookies()).toString();
  if (!cookie) return null;
  const result = await apiFetch("/api/me", meResponseSchema, { cookie });
  return result.ok ? result.data.user : null;
});
