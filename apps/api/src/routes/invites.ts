import {
  type ApiError,
  type CreateInviteResponse,
  verifyInviteRequestSchema,
  type VerifyInviteResponse,
} from "@watchlog/contracts";
import type { DbClient } from "@watchlog/db";
import { Hono } from "hono";
import { setCookie } from "hono/cookie";

import type { Auth } from "../auth";
import { requireSession } from "../middleware/session";
import { assertInviteUsable, createInvite, INVITE_COOKIE, InviteError } from "../services/invites";

export function invitesRoute({
  db,
  auth,
  secureCookies,
}: {
  db: DbClient;
  auth: Auth;
  secureCookies: boolean;
}) {
  return new Hono()
    .post("/verify", async (c) => {
      const parsed = verifyInviteRequestSchema.safeParse(await c.req.json().catch(() => null));
      if (!parsed.success) {
        const message = parsed.error.issues[0]?.message ?? "Petición inválida.";
        return c.json<ApiError>({ error: { code: "INVALID_REQUEST", message } }, 400);
      }

      try {
        const invite = await assertInviteUsable(db, parsed.data.code);
        // La lee el hook de Better Auth al crear el usuario (email o callback OAuth).
        setCookie(c, INVITE_COOKIE, invite.code, {
          httpOnly: true,
          sameSite: "Lax",
          secure: secureCookies,
          path: "/api/auth",
          maxAge: 60 * 60,
        });
        return c.json<VerifyInviteResponse>({ valid: true, expiresAt: invite.expiresAt.toISOString() });
      } catch (error) {
        if (error instanceof InviteError) {
          return c.json<ApiError>({ error: { code: error.code, message: error.message } }, 404);
        }
        throw error;
      }
    })
    .post("/", requireSession(auth), async (c) => {
      const invite = await createInvite(db, c.var.user.id);
      return c.json<CreateInviteResponse>(
        { code: invite.code, expiresAt: invite.expiresAt.toISOString() },
        201,
      );
    });
}
