import { expect, type Page, type TestInfo } from "@playwright/test";

/** Registra a un usuario nuevo con la invitación `${runId}-${proyecto}${purpose}` creada en globalSetup. */
export async function signUp(page: Page, testInfo: TestInfo, purpose: string) {
  const code = `${process.env.E2E_RUN_ID}-${testInfo.project.name}${purpose}`;
  await page.goto(`/signup?code=${code}`);
  await page.getByLabel("Nombre").fill("Ana E2E");
  await page.getByLabel("Email").fill(`${code}@example.com`);
  await page.getByLabel("Contraseña").fill("contraseña-segura");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Biblioteca" })).toBeVisible();
}
