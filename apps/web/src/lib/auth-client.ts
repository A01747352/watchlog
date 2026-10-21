import { createAuthClient } from "better-auth/react";

/** Cliente de Better Auth para componentes cliente. Mismo origen: /api/auth/* va a la API. */
export const authClient = createAuthClient();

/** Mensajes en español para los códigos de error que vemos en login y registro. */
const authErrorMessages: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Email o contraseña incorrectos.",
  USER_ALREADY_EXISTS: "Ya hay una cuenta con ese email. Inicia sesión.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Ya hay una cuenta con ese email. Inicia sesión.",
  PASSWORD_TOO_SHORT: "La contraseña debe tener al menos 8 caracteres.",
  INVALID_EMAIL: "Ese email no es válido.",
  INVITE_REQUIRED: "Watchlog es solo por invitación: necesitas un código para registrarte.",
  INVITE_USED: "Ese código de invitación ya se usó.",
  INVITE_EXPIRED: "Ese código de invitación caducó.",
  INVITE_NOT_FOUND: "Ese código de invitación no existe.",
  // Error genérico de Better Auth al volver de OAuth sin poder crear el usuario.
  UNABLE_TO_CREATE_USER: "No pudimos crear tu cuenta: Watchlog es solo por invitación.",
  unable_to_create_user: "No pudimos crear tu cuenta: Watchlog es solo por invitación.",
};

export function authErrorMessage(
  code: string | undefined | null,
  fallback = "Algo salió mal. Inténtalo de nuevo.",
) {
  return (code && authErrorMessages[code]) || fallback;
}
