import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { defineConfig, devices } from "@playwright/test";

const rootEnv = fileURLToPath(new URL("../../.env", import.meta.url));
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const webPort = 3000;
// Mismo puerto que en desarrollo: los rewrites de la build apuntan a API_URL (por defecto :3001).
const apiPort = 3001;
const baseURL = `http://localhost:${webPort}`;
/** Servidor falso de TMDB y AniList (tests/e2e/mock-providers.mjs). */
const mockPort = 3999;
const mockURL = `http://localhost:${mockPort}`;

/** Base de datos propia de E2E: E2E_DATABASE_URL o DATABASE_URL con el nombre `watchlog_e2e`. */
function e2eDatabaseUrl() {
  const base = process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!base) throw new Error("E2E necesita Postgres: define DATABASE_URL y ejecuta `docker compose up db`.");
  const url = new URL(base);
  if (!process.env.E2E_DATABASE_URL) url.pathname = "/watchlog_e2e";
  return url.toString();
}

process.env.E2E_DATABASE_URL = e2eDatabaseUrl();

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: true,
  // En local, 2 workers: con más, cada uno abre su Chromium y en máquinas justas de RAM
  // (Docker + navegador + editor) los tiempos se disparan. La CI usa el valor por defecto.
  ...(!process.env.CI && { workers: 2 }),
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: [
    {
      command: "node tests/e2e/mock-providers.mjs",
      url: `${mockURL}/health`,
      reuseExistingServer: false,
      env: { MOCK_PROVIDERS_PORT: String(mockPort) },
    },
    {
      // Migra la base de E2E antes de arrancar: Playwright lanza los servidores antes que globalSetup.
      command: "pnpm --filter db migrate:deploy && pnpm --filter api start",
      url: `http://localhost:${apiPort}/health`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        NODE_ENV: "test",
        PORT: String(apiPort),
        DATABASE_URL: process.env.E2E_DATABASE_URL,
        BETTER_AUTH_SECRET: "e2e-secret-e2e-secret-e2e-secret-123456",
        BETTER_AUTH_URL: baseURL,
        GITHUB_CLIENT_ID: "",
        GITHUB_CLIENT_SECRET: "",
        GOOGLE_CLIENT_ID: "",
        GOOGLE_CLIENT_SECRET: "",
        // Los E2E nunca llaman a TMDB ni a AniList: usan el servidor falso con fixtures reales.
        TMDB_READ_TOKEN: "e2e-token",
        TMDB_API_URL: `${mockURL}/tmdb/3`,
        ANILIST_API_URL: `${mockURL}/anilist`,
      },
    },
    {
      // Los rewrites se resuelven al compilar: la build de web debe hacerse con este API_URL.
      command: "pnpm start",
      url: `${baseURL}/login`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { API_URL: `http://localhost:${apiPort}` },
    },
  ],
});
