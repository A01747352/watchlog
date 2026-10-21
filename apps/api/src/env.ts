import { z } from "zod";

/** Cadena vacía → undefined, para que `VAR=` en .env cuente como "no definida". */
const optional = z.preprocess((value) => (value === "" ? undefined : value), z.string().optional());

/**
 * Variables de entorno de la API, validadas al arrancar.
 * Si falta o es inválida alguna, la app no inicia y dice cuál.
 */
const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3001),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/, error: "Debe ser una URL postgresql://" }),
    BETTER_AUTH_SECRET: z.string().min(32, "Debe tener al menos 32 caracteres"),
    BETTER_AUTH_URL: z.url(),
    GITHUB_CLIENT_ID: optional,
    GITHUB_CLIENT_SECRET: optional,
    GOOGLE_CLIENT_ID: optional,
    GOOGLE_CLIENT_SECRET: optional,
  })
  .superRefine((env, ctx) => {
    for (const provider of ["GITHUB", "GOOGLE"] as const) {
      const id = env[`${provider}_CLIENT_ID`];
      const secret = env[`${provider}_CLIENT_SECRET`];
      if (Boolean(id) !== Boolean(secret)) {
        ctx.addIssue({
          code: "custom",
          path: [id ? `${provider}_CLIENT_SECRET` : `${provider}_CLIENT_ID`],
          message: `Define ${provider}_CLIENT_ID y ${provider}_CLIENT_SECRET juntas (o ninguna)`,
        });
      }
    }
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
