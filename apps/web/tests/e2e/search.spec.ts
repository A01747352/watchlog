import { expect, test } from "@playwright/test";

import { signUp } from "./helpers";

// TMDB y AniList los sirve tests/e2e/mock-providers.mjs con fixtures reales.

test("buscar → Visto con Enter → calificar desde el toast", async ({ page }, testInfo) => {
  await signUp(page, testInfo, "-search");
  await page.goto("/search");

  // Enter inmediato: se aplica al primer resultado en cuanto llega la búsqueda.
  const search = page.getByRole("combobox", { name: "Buscar películas, series y anime" });
  await search.fill("frieren");
  await search.press("Enter");

  const toast = page.getByRole("status");
  await expect(toast).toContainText("Frieren: Beyond Journey’s End");
  await expect(toast).toContainText("Añadido como Terminado");
  await expect(page.getByRole("option").first()).toContainText("Terminado");

  // La versión de TMDB del anime no aparece duplicada
  await expect(page.getByRole("option", { name: /Frieren: Tras finalizar el viaje/ })).toHaveCount(0);

  await toast.getByRole("button", { name: "Calificar" }).click();
  const dialog = page.getByRole("dialog", { name: "Frieren: Beyond Journey’s End" });
  await expect(dialog).toBeVisible();

  const slider = dialog.getByRole("slider", { name: "Mi nota" });
  await slider.focus();
  await page.keyboard.press("9");
  await page.keyboard.press("ArrowRight");
  await expect(slider).toHaveAttribute("aria-valuetext", "9.5 de 10, Excelente");

  await dialog.getByLabel(/Reseña corta/).fill("Una serie sobre el tiempo y la memoria.");
  await dialog.getByRole("button", { name: "Lloré" }).click();
  await expect(dialog.getByRole("button", { name: "Lloré" })).toHaveAttribute("aria-pressed", "true");
  await dialog.getByRole("button", { name: "Guardar nota" }).click();

  await expect(dialog).toBeHidden();
  await expect(toast).toContainText("Nota guardada: 9.5");
});

test("Pendiente con Alt+P y Deshacer", async ({ page }, testInfo) => {
  await signUp(page, testInfo, "-undo");
  await page.goto("/search");

  const search = page.getByRole("combobox");
  await search.fill("dune");
  const first = page.getByRole("option").first();
  await expect(first).toContainText("Dune");
  await expect(first).toContainText("2021"); // la película de 2021 va primero por popularidad

  await search.press("Alt+KeyP");
  const toast = page.getByRole("status");
  await expect(toast).toContainText("Añadido como Pendiente");
  await expect(toast.getByRole("button", { name: "Calificar" })).toHaveCount(0); // no se califica lo no visto
  await expect(first).toContainText("Pendiente");

  await toast.getByRole("button", { name: "Deshacer" }).click();
  await expect(first.getByRole("button", { name: "Marcar Dune como visto" })).toBeVisible();
});

test("⌘K abre la búsqueda desde cualquier pantalla", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Atajo de teclado de escritorio");
  await signUp(page, testInfo, "-cmdk");
  await page.keyboard.press("ControlOrMeta+k");
  const dialog = page.getByRole("dialog", { name: "Buscar" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("combobox")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});
