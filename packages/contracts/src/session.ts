import { z } from "zod";

export const sessionUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  image: z.string().nullable(),
});
export type SessionUser = z.infer<typeof sessionUserSchema>;

/** `GET /api/me`: usuario de la sesión actual (401 si no hay sesión). */
export const meResponseSchema = z.object({ user: sessionUserSchema });
export type MeResponse = z.infer<typeof meResponseSchema>;

/** `GET /api/auth-providers`: métodos de acceso activos, para pintar el login. */
export const authProvidersResponseSchema = z.object({
  emailPassword: z.literal(true),
  github: z.boolean(),
  google: z.boolean(),
});
export type AuthProvidersResponse = z.infer<typeof authProvidersResponseSchema>;
