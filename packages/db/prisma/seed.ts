import { randomBytes } from "node:crypto";

import { createDbClient } from "../src/index";

/**
 * Seed de desarrollo: crea la invitación de arranque para registrar al primer usuario
 * (el registro solo es por invitación). Idempotente.
 */
const url = process.env.DATABASE_URL;
if (!url) throw new Error("Falta DATABASE_URL para ejecutar el seed.");

const db = createDbClient(url);
const code = process.env.SEED_INVITE_CODE ?? randomBytes(6).toString("base64url");
const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

try {
  const invite = await db.invite.upsert({
    where: { code },
    update: {},
    create: { code, expiresAt },
  });
  const state = invite.usedBy ? "ya usada" : `válida hasta ${invite.expiresAt.toISOString().slice(0, 10)}`;
  console.log(`Invitación de arranque: ${invite.code} (${state})`);
  console.log(`Regístrate en http://localhost:3000/signup?code=${invite.code}`);
} finally {
  await db.$disconnect();
}
