import { z } from "zod";

/** Respuesta de `GET /health`: 200 si todo está bien, 503 si la base de datos no responde. */
export const healthResponseSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  service: z.literal("api"),
  version: z.string(),
  database: z.enum(["up", "down"]),
  uptimeSeconds: z.number().nonnegative(),
  timestamp: z.iso.datetime(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
