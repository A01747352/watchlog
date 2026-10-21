import type { AuthProvidersResponse, MeResponse } from "@watchlog/contracts";
import { Hono } from "hono";

import type { Auth } from "../auth";
import { requireSession } from "../middleware/session";

export function sessionRoutes({
  auth,
  providers,
}: {
  auth: Auth;
  providers: { github: boolean; google: boolean };
}) {
  return new Hono()
    .get("/me", requireSession(auth), (c) => c.json<MeResponse>({ user: c.var.user }))
    .get("/auth-providers", (c) => c.json<AuthProvidersResponse>({ emailPassword: true, ...providers }));
}
