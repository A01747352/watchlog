import { randomBytes } from "node:crypto";

import type { InviteErrorCode } from "@watchlog/contracts";
import type { DbClient } from "@watchlog/db";

/** Nombre de la cookie que lleva el código verificado hasta Better Auth. */
export const INVITE_COOKIE = "wl_invite";
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export class InviteError extends Error {
  constructor(readonly code: InviteErrorCode) {
    const messages: Record<InviteErrorCode, string> = {
      INVITE_NOT_FOUND: "Ese código de invitación no existe.",
      INVITE_USED: "Ese código de invitación ya se usó.",
      INVITE_EXPIRED: "Ese código de invitación caducó.",
      INVITE_REQUIRED: "Watchlog es solo por invitación: necesitas un código para registrarte.",
    };
    super(messages[code]);
    this.name = "InviteError";
  }
}

/** Comprueba que el código existe, no se usó y no caducó. Lanza InviteError si no. */
export async function assertInviteUsable(db: DbClient, code: string, now = new Date()) {
  const invite = await db.invite.findUnique({ where: { code } });
  if (!invite) throw new InviteError("INVITE_NOT_FOUND");
  if (invite.usedBy) throw new InviteError("INVITE_USED");
  if (invite.expiresAt <= now) throw new InviteError("INVITE_EXPIRED");
  return invite;
}

/**
 * Marca la invitación como usada por `userId` de forma atómica: solo una petición
 * concurrente puede reclamarla. Devuelve false si otra la reclamó antes.
 */
export async function claimInvite(db: DbClient, code: string, userId: string, now = new Date()) {
  const { count } = await db.invite.updateMany({
    where: { code, usedBy: null, expiresAt: { gt: now } },
    data: { usedBy: userId, usedAt: now },
  });
  return count === 1;
}

export function generateInviteCode() {
  return randomBytes(9).toString("base64url");
}

export async function createInvite(db: DbClient, createdBy: string, now = new Date()) {
  return db.invite.create({
    data: { code: generateInviteCode(), createdBy, expiresAt: new Date(now.getTime() + INVITE_TTL_MS) },
  });
}
