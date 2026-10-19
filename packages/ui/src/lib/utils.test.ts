import { cn } from "./utils";

describe("cn", () => {
  it("combina clases y resuelve conflictos de Tailwind", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("no confunde la escala tipográfica propia con colores", () => {
    expect(cn("text-h1 text-brand")).toBe("text-h1 text-brand");
    expect(cn("text-h1", "text-h2")).toBe("text-h2");
  });

  it("trata shadow-poster como sombra", () => {
    expect(cn("shadow-sm", "shadow-poster")).toBe("shadow-poster");
  });
});
