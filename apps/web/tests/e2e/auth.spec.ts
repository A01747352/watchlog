import { expect, test } from "@playwright/test";

test("sin sesión, la zona privada redirige a /login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { level: 1, name: "Hola de nuevo" })).toBeVisible();
});

test("un código inexistente no permite registrarse", async ({ page }) => {
  await page.goto("/signup?code=no-existe-123");
  await page.getByLabel("Nombre").fill("Nadie");
  await page.getByLabel("Email").fill("nadie@example.com");
  await page.getByLabel("Contraseña").fill("contraseña-segura");
  await page.getByRole("button", { name: "Crear cuenta" }).click();

  await expect(page.getByRole("main").getByRole("alert")).toContainText("no existe");
  await expect(page).toHaveURL(/\/signup/);
});

test("registro por invitación, salir, volver a entrar e invitar a otra persona", async ({
  page,
}, testInfo) => {
  const code = `${process.env.E2E_RUN_ID}-${testInfo.project.name}`;
  const email = `${code}@example.com`;
  const password = "contraseña-segura";

  // Registro con el enlace de invitación
  await page.goto(`/signup?code=${code}`);
  await expect(page.getByLabel("Código de invitación")).toHaveValue(code);
  await page.getByLabel("Nombre").fill("Ana E2E");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Hola, Ana E2E" })).toBeVisible();

  // Con sesión, /login vuelve al inicio
  await page.goto("/login");
  await expect(page).toHaveURL(/\/$/);

  // Salir
  await page.getByRole("button", { name: "Salir" }).click();
  await expect(page).toHaveURL(/\/login$/);

  // El código ya está usado
  await page.goto(`/signup?code=${code}`);
  await page.getByLabel("Nombre").fill("Otra");
  await page.getByLabel("Email").fill(`otra-${email}`);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("ya se usó");

  // Entrar con email y contraseña
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Hola, Ana E2E" })).toBeVisible();

  // Crear una invitación para un amigo
  await page.getByRole("button", { name: "Crear invitación" }).click();
  await expect(page.getByLabel("Enlace de invitación")).toHaveValue(/\/signup\?code=[\w-]+$/);
});
