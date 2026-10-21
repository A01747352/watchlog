import type { DbClient } from "@watchlog/db";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError } from "better-auth/api";

import type { Env } from "./env";
import { assertInviteUsable, claimInvite, INVITE_COOKIE, InviteError } from "./services/invites";

type OAuthEnv = Pick<
  Env,
  "GITHUB_CLIENT_ID" | "GITHUB_CLIENT_SECRET" | "GOOGLE_CLIENT_ID" | "GOOGLE_CLIENT_SECRET"
>;
type AuthEnv = OAuthEnv & Pick<Env, "BETTER_AUTH_SECRET" | "BETTER_AUTH_URL">;

export function enabledSocialProviders(env: OAuthEnv) {
  return {
    github: Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
    google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
  };
}

/**
 * Better Auth: email + contraseña y, si están configurados, GitHub y Google.
 * El registro es solo por invitación: antes de crear un usuario (por cualquier vía)
 * se exige la cookie `wl_invite` que deja `POST /api/invites/verify`.
 */
export function createAuth({ db, env }: { db: DbClient; env: AuthEnv }) {
  const social = enabledSocialProviders(env);

  return betterAuth({
    appName: "Watchlog",
    baseURL: env.BETTER_AUTH_URL,
    basePath: "/api/auth",
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.BETTER_AUTH_URL],
    database: prismaAdapter(db, { provider: "postgresql" }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      autoSignIn: true,
    },
    socialProviders: {
      ...(social.github && {
        github: { clientId: env.GITHUB_CLIENT_ID!, clientSecret: env.GITHUB_CLIENT_SECRET! },
      }),
      ...(social.google && {
        google: { clientId: env.GOOGLE_CLIENT_ID!, clientSecret: env.GOOGLE_CLIENT_SECRET! },
      }),
    },
    databaseHooks: {
      user: {
        create: {
          before: async (_user, ctx) => {
            const code = ctx?.getCookie(INVITE_COOKIE);
            try {
              if (!code) throw new InviteError("INVITE_REQUIRED");
              await assertInviteUsable(db, code);
            } catch (error) {
              if (error instanceof InviteError) {
                throw new APIError("FORBIDDEN", { code: error.code, message: error.message });
              }
              throw error;
            }
          },
          after: async (user, ctx) => {
            const code = ctx?.getCookie(INVITE_COOKIE);
            // Carrera: dos registros con el mismo código. El segundo no puede quedarse sin invitación.
            if (!code || !(await claimInvite(db, code, user.id))) {
              await db.user.delete({ where: { id: user.id } });
              throw new APIError("FORBIDDEN", {
                code: "INVITE_USED",
                message: new InviteError("INVITE_USED").message,
              });
            }
          },
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
