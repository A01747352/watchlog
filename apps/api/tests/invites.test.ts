import { apiErrorSchema, createInviteResponseSchema, verifyInviteResponseSchema } from "@watchlog/contracts";
import { describe, expect, it } from "vitest";

import { claimInvite } from "../src/services/invites";
import { cookiesFrom, createInviteRow, jsonRequest, setupTestApp } from "./support/app";

const signUp = { name: "Ana", email: "ana@example.com", password: "contraseña-segura" };

describe("POST /api/invites/verify", () => {
  const { app, db } = setupTestApp();

  it("acepta un código válido y deja la cookie para Better Auth", async () => {
    await createInviteRow(db, "bienvenida");
    const res = await app.request("/api/invites/verify", jsonRequest({ code: "bienvenida" }));

    expect(res.status).toBe(200);
    verifyInviteResponseSchema.parse(await res.json());
    const cookie = res.headers.getSetCookie().find((c) => c.startsWith("wl_invite="));
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Path=\/api\/auth/);
  });

  it("rechaza un cuerpo inválido con 400", async () => {
    const res = await app.request("/api/invites/verify", jsonRequest({ code: "a b" }));
    expect(res.status).toBe(400);
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe("INVALID_REQUEST");
  });

  it.each([
    ["INVITE_NOT_FOUND", async () => {}],
    [
      "INVITE_EXPIRED",
      (db: Parameters<typeof createInviteRow>[0]) =>
        createInviteRow(db, "codigo1", { expiresAt: new Date(Date.now() - 1000) }),
    ],
  ] as const)("responde 404 %s", async (code, arrange) => {
    await arrange(db);
    const res = await app.request("/api/invites/verify", jsonRequest({ code: "codigo1" }));
    expect(res.status).toBe(404);
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe(code);
  });
});

describe("registro solo por invitación", () => {
  const { app, db } = setupTestApp();

  async function verify(code: string) {
    const res = await app.request("/api/invites/verify", jsonRequest({ code }));
    return cookiesFrom(res);
  }

  it("sin invitación, Better Auth no crea el usuario", async () => {
    const res = await app.request("/api/auth/sign-up/email", jsonRequest(signUp));
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: "INVITE_REQUIRED" });
    expect(await db.user.count()).toBe(0);
  });

  it("con invitación verificada crea el usuario, abre sesión y consume el código", async () => {
    await createInviteRow(db, "bienvenida");
    const res = await app.request("/api/auth/sign-up/email", jsonRequest(signUp, await verify("bienvenida")));

    expect(res.status).toBe(200);
    const user = await db.user.findUniqueOrThrow({ where: { email: signUp.email } });
    const invite = await db.invite.findUniqueOrThrow({ where: { code: "bienvenida" } });
    expect(invite.usedBy).toBe(user.id);
    expect(invite.usedAt).toBeInstanceOf(Date);

    // El código ya no sirve para otra persona.
    const again = await app.request("/api/invites/verify", jsonRequest({ code: "bienvenida" }));
    expect(apiErrorSchema.parse(await again.json()).error.code).toBe("INVITE_USED");
  });

  it("si otra persona usó el código entre la verificación y el registro, lo rechaza", async () => {
    await createInviteRow(db, "bienvenida");
    const cookie = await verify("bienvenida");
    await app.request("/api/auth/sign-up/email", jsonRequest(signUp, cookie));

    const res = await app.request(
      "/api/auth/sign-up/email",
      jsonRequest({ ...signUp, email: "otra@example.com" }, cookie),
    );
    expect(res.status).toBe(403);
    expect(await db.user.count()).toBe(1);
  });

  it("claimInvite solo deja reclamar una vez", async () => {
    await createInviteRow(db, "unica");
    const a = await db.user.create({ data: { id: "u1", name: "A", email: "a@example.com" } });
    const b = await db.user.create({ data: { id: "u2", name: "B", email: "b@example.com" } });

    const results = await Promise.all([claimInvite(db, "unica", a.id), claimInvite(db, "unica", b.id)]);
    expect(results.filter(Boolean)).toHaveLength(1);
  });
});

describe("rutas con sesión", () => {
  const { app, db } = setupTestApp();

  async function signedInCookie() {
    await createInviteRow(db, "bienvenida");
    const verified = cookiesFrom(
      await app.request("/api/invites/verify", jsonRequest({ code: "bienvenida" })),
    );
    const res = await app.request("/api/auth/sign-up/email", jsonRequest(signUp, verified));
    return cookiesFrom(res, verified);
  }

  it("GET /api/me responde 401 sin sesión", async () => {
    const res = await app.request("/api/me");
    expect(res.status).toBe(401);
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe("UNAUTHORIZED");
  });

  it("GET /api/me devuelve el usuario de la sesión", async () => {
    const res = await app.request("/api/me", { headers: { cookie: await signedInCookie() } });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ user: { name: "Ana", email: signUp.email, image: null } });
  });

  it("POST /api/invites crea una invitación para un amigo", async () => {
    const cookie = await signedInCookie();
    const res = await app.request("/api/invites", jsonRequest({}, cookie));
    expect(res.status).toBe(201);

    const { code } = createInviteResponseSchema.parse(await res.json());
    const invite = await db.invite.findUniqueOrThrow({ where: { code } });
    expect(invite.createdBy).not.toBeNull();
    expect(invite.usedBy).toBeNull();
  });

  it("POST /api/invites exige sesión", async () => {
    const res = await app.request("/api/invites", jsonRequest({}));
    expect(res.status).toBe(401);
  });

  it("el login con email y contraseña funciona tras registrarse", async () => {
    await signedInCookie();
    const res = await app.request(
      "/api/auth/sign-in/email",
      jsonRequest({ email: signUp.email, password: signUp.password }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.getSetCookie().some((c) => c.includes("session_token"))).toBe(true);
  });
});

describe("GET /api/auth-providers", () => {
  it("refleja los proveedores OAuth configurados", async () => {
    const { app } = setupTestApp({ GITHUB_CLIENT_ID: "id", GITHUB_CLIENT_SECRET: "secret" });
    const res = await app.request("/api/auth-providers");
    expect(await res.json()).toEqual({ emailPassword: true, github: true, google: false });
  });
});
