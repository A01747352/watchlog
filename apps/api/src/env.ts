import { z } from "zod";

/**
 * Variables de entorno de la API, validadas al arrancar.
 * Si falta o es inválida alguna, la app no inicia y dice cuál.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(raíz)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Variables de entorno inválidas en apps/api:\n${problems}`);
  }
  return result.data;
}
