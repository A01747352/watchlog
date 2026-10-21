import { z } from "zod";

/** Código de invitación: letras, números, guion y guion bajo. */
export const inviteCodeSchema = z
  .string()
  .trim()
  .min(4, "El código es demasiado corto")
  .max(64, "El código es demasiado largo")
  .regex(/^[A-Za-z0-9_-]+$/, "El código solo puede tener letras, números, - y _");

/**
 * `POST /api/invites/verify`: comprueba un código y, si es válido, deja una cookie
 * httpOnly que Better Auth exige al crear el usuario (email o OAuth).
 */
export const verifyInviteRequestSchema = z.object({ code: inviteCodeSchema });
export type VerifyInviteRequest = z.infer<typeof verifyInviteRequestSchema>;

export const verifyInviteResponseSchema = z.object({
  valid: z.literal(true),
  expiresAt: z.iso.datetime(),
});
export type VerifyInviteResponse = z.infer<typeof verifyInviteResponseSchema>;

/** Motivos por los que un código no sirve (códigos de error de la API). */
export const inviteErrorCodes = [
  "INVITE_NOT_FOUND",
  "INVITE_USED",
  "INVITE_EXPIRED",
  "INVITE_REQUIRED",
] as const;
export type InviteErrorCode = (typeof inviteErrorCodes)[number];

/** `POST /api/invites` (con sesión): crea una invitación para un amigo. */
export const createInviteResponseSchema = z.object({
  code: inviteCodeSchema,
  expiresAt: z.iso.datetime(),
});
export type CreateInviteResponse = z.infer<typeof createInviteResponseSchema>;
