import { expect, test } from "@playwright/test";

test("la portada carga con el tema oscuro y permite cambiar a claro", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("html")).toHaveClass(/dark/);

  const background = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const darkBackground = await background();

  await page.getByRole("button", { name: "Cambiar a modo claro" }).click();
  await expect(page.locator("html")).toHaveClass(/light/);
  expect(await background()).not.toBe(darkBackground);
});

test("el pie incluye la atribución de TMDB", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("contentinfo")).toContainText(
    "Este producto usa la API de TMDB, pero no está respaldado ni certificado por TMDB.",
  );
});
