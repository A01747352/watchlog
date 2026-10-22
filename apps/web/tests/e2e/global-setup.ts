import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import type { FullConfig } from "@playwright/test";

const dbPackage = fileURLToPath(new URL("../../../../packages/db", import.meta.url));
const requireFromDb = createRequire(`${dbPackage}/package.json`);

function runInDb(script: string, args: string[], env: Record<string, string>) {
  execFileSync(process.execPath, [requireFromDb.resolve(script), ...args], {
    cwd: dbPackage,
    env: { ...process.env, ...env },
    stdio: "pipe",
  });
}

/**
 * Prepara la base de datos de E2E (migraciones) y crea una invitación por proyecto
 * (desktop, mobile) con un prefijo único por ejecución, a través del seed de packages/db.
 * apps/web no importa @watchlog/db: solo ejecuta sus scripts.
 */
export default function globalSetup(config: FullConfig) {
  const DATABASE_URL = process.env.E2E_DATABASE_URL!;
  runInDb("prisma/build/index.js", ["migrate", "deploy"], { DATABASE_URL });

  const runId = `e2e-${Date.now().toString(36)}`;
  // Una invitación por proyecto (desktop, mobile) y por cada test que registra a alguien.
  for (const project of config.projects) {
    for (const purpose of ["", "-search", "-undo", "-cmdk"]) {
      runInDb("tsx/cli", ["prisma/seed.ts"], {
        DATABASE_URL,
        SEED_INVITE_CODE: `${runId}-${project.name}${purpose}`,
      });
    }
  }
  process.env.E2E_RUN_ID = runId;
}
