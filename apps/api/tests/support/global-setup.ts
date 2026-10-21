import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import type { TestProject } from "vitest/node";

const rootEnv = fileURLToPath(new URL("../../../../.env", import.meta.url));
const dbPackage = fileURLToPath(new URL("../../../../packages/db", import.meta.url));

/**
 * Prepara la base de datos de integración: `TEST_DATABASE_URL` o, si no existe, la de
 * `DATABASE_URL` con el nombre `watchlog_test`. Aplica las migraciones antes de los tests.
 * Necesita Postgres en marcha: `docker compose up db`.
 */
export default function setup(project: TestProject) {
  if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

  const base = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!base) {
    throw new Error(
      "Los tests de apps/api necesitan Postgres: define DATABASE_URL (o TEST_DATABASE_URL) y ejecuta `docker compose up db`.",
    );
  }
  const url = new URL(base);
  if (!process.env.TEST_DATABASE_URL) url.pathname = "/watchlog_test";
  const testUrl = url.toString();

  try {
    const prismaCli = createRequire(`${dbPackage}/package.json`).resolve("prisma/build/index.js");
    execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], {
      cwd: dbPackage,
      env: { ...process.env, DATABASE_URL: testUrl },
      stdio: "pipe",
    });
  } catch (error) {
    const output = (error as { stdout?: Buffer; stderr?: Buffer }).stderr?.toString() ?? "";
    throw new Error(
      `No se pudo migrar la base de datos de test (${url.host}). ¿Está Postgres en marcha?\n${output}`,
    );
  }

  project.provide("testDatabaseUrl", testUrl);
}

declare module "vitest" {
  export interface ProvidedContext {
    testDatabaseUrl: string;
  }
}
