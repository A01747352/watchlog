import type { ApiError, SessionUser } from "@watchlog/contracts";
import { createMiddleware } from "hono/factory";

import type { Auth } from "../auth";

export type SessionVariables = { user: SessionUser };

/** Exige sesión de Better Auth; deja el usuario en `c.var.user` o responde 401. */
export function requireSession(auth: Auth) {
  return createMiddleware<{ Variables: SessionVariables }>(async (c, next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
      return c.json<ApiError>(
        { error: { code: "UNAUTHORIZED", message: "Inicia sesión para continuar." } },
        401,
      );
    }
    const { id, name, email, image } = session.user;
    c.set("user", { id, name, email, image: image ?? null });
    await next();
  });
}
