import { z } from "zod";

/** Forma común de los errores de la API (excepto los de Better Auth en /api/auth/*). */
export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export type ApiError = z.infer<typeof apiErrorSchema>;
