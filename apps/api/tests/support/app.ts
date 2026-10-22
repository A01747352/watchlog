import { createDbClient, type DbClient } from "@watchlog/db";
import { afterAll, beforeEach, inject } from "vitest";

import { createApp } from "../../src/app";
import type { SearchProviders } from "../../src/routes/search";
import { createAuth } from "../../src/auth";
import type { Env } from "../../src/env";

export const WEB_ORIGIN = "http://localhost:3000";

export const testEnv = {
  NODE_ENV: "test",
  PORT: 3001,
  DATABASE_URL: inject("testDatabaseUrl"),
  BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret-123",
  BETTER_AUTH_URL: WEB_ORIGIN,
  TMDB_LANGUAGE: "es-ES",
} satisfies Env;

/** App real (Hono + Better Auth + Prisma) contra la base de datos de test, limpia en cada test. */
export function setupTestApp(overrides: Partial<Env> = {}, providers: SearchProviders = {}) {
  const env: Env = { ...testEnv, ...overrides };
  const db = createDbClient(env.DATABASE_URL);
  const auth = createAuth({ db, env });
  const app = createApp({ db, auth, env, providers, log: false });

  beforeEach(async () => {
    await db.$executeRawUnsafe(
      'TRUNCATE TABLE "Invite", "Recommendation", "Viewing", "LibraryEntry", "Title", "verification", "account", "session", "user" CASCADE',
    );
  });
  afterAll(() => db.$disconnect());

  return { app, db, env };
}

/** Une las cookies `Set-Cookie` de una respuesta en una cabecera `Cookie`. */
export function cookiesFrom(res: Response, previous = "") {
  const jar = new Map(
    previous
      .split("; ")
      .filter(Boolean)
      .map((pair) => pair.split("=") as [string, string]),
  );
  for (const header of res.headers.getSetCookie()) {
    const [pair] = header.split(";");
    const [name, ...value] = pair!.split("=");
    jar.set(name!, value.join("="));
  }
  return [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
}

export function jsonRequest(body: unknown, cookie = ""): RequestInit {
  return {
    method: "POST",
    headers: { "content-type": "application/json", origin: WEB_ORIGIN, ...(cookie && { cookie }) },
    body: JSON.stringify(body),
  };
}

export async function createInviteRow(
  db: DbClient,
  code: string,
  data: { expiresAt?: Date; usedBy?: string } = {},
) {
  return db.invite.create({
    data: { code, expiresAt: data.expiresAt ?? new Date(Date.now() + 60_000), usedBy: data.usedBy ?? null },
  });
}

/** Registra a un usuario (con invitación) y devuelve la cabecera Cookie con su sesión. */
export async function signedInCookie(
  app: ReturnType<typeof createApp>,
  db: DbClient,
  user = { name: "Ana", email: "ana@example.com", password: "contraseña-segura" },
) {
  const code = `inv-${Math.random().toString(36).slice(2, 10)}`;
  await createInviteRow(db, code);
  const verified = cookiesFrom(await app.request("/api/invites/verify", jsonRequest({ code })));
  const res = await app.request("/api/auth/sign-up/email", jsonRequest(user, verified));
  if (!res.ok) throw new Error(`No se pudo registrar al usuario de prueba: ${res.status}`);
  return cookiesFrom(res, verified);
}
