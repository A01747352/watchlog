import { z } from "zod";

/** Respuesta de `GET /health`. En la Fase 2 se añadirá el estado de la base de datos. */
export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.literal("api"),
  version: z.string(),
  uptimeSeconds: z.number().nonnegative(),
  timestamp: z.iso.datetime(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
