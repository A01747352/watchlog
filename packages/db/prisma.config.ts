import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { defineConfig } from "prisma/config";

// Prisma 7 ya no carga .env por su cuenta: usamos el .env de la raíz del monorepo si existe.
const rootEnv = fileURLToPath(new URL("../../.env", import.meta.url));
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // `prisma generate` no necesita URL; migrate y seed sí (fallan diciendo que falta DATABASE_URL).
  datasource: { url: process.env.DATABASE_URL ?? "" },
});
