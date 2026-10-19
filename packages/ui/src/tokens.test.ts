import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { colorTokenGroups, shadowTokens } from "./tokens";

const read = (file: string) =>
  readFileSync(fileURLToPath(new URL(file, import.meta.url)), "utf8").replaceAll("\r\n", "\n");

const tokensCss = read("./styles/tokens.css");
const globalsCss = read("./styles/globals.css");

/** Devuelve el cuerpo del primer bloque cuyo selector empieza por `selector`. */
function block(css: string, selector: string) {
  const start = css.indexOf(`${selector}`);
  if (start === -1) throw new Error(`No se encontró el bloque ${selector}`);
  const open = css.indexOf("{", start);
  const close = css.indexOf("\n}", open);
  return css.slice(open + 1, close);
}

const darkBlock = block(tokensCss, ":root,\n.dark");
const lightBlock = block(tokensCss, ".light {");

const colorTokens = colorTokenGroups.flatMap((group) => group.tokens);

describe("tokens.css", () => {
  it.each([...colorTokens, ...shadowTokens])("--%s existe en tema oscuro y claro", (token) => {
    expect(darkBlock).toMatch(new RegExp(`--${token}:`));
    expect(lightBlock).toMatch(new RegExp(`--${token}:`));
  });

  it("todos los colores usan oklch", () => {
    for (const token of colorTokens) {
      const value = new RegExp(String.raw`--${token}:\s*([^;]+);`).exec(lightBlock)?.[1];
      expect(value, token).toMatch(/^oklch\(/);
    }
  });
});

describe("globals.css (@theme)", () => {
  it.each(colorTokens)("--%s está expuesto a Tailwind como --color-*", (token) => {
    const exposed = token.replace(/^type-/, "");
    expect(globalsCss).toContain(`--color-${exposed}: var(--${token});`);
  });

  it.each(shadowTokens)("--%s está expuesto a Tailwind", (token) => {
    expect(globalsCss).toContain(`--${token}: var(--${token});`);
  });
});
