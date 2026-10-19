import { colorTokenGroups } from "@watchlog/ui/tokens";
import { render, screen, within } from "@testing-library/react";

import HomePage from "./page";

describe("HomePage", () => {
  it("muestra el título y las secciones del sistema de diseño", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveClass("font-display", "text-page");
    for (const name of ["Color", "Tipo de contenido", "Tipografía", "Radios", "Sombras"]) {
      expect(screen.getByRole("heading", { level: 2, name: new RegExp(name) })).toBeInTheDocument();
    }
  });

  it("pinta una muestra por cada token de color", () => {
    render(<HomePage />);
    for (const token of colorTokenGroups.flatMap((group) => group.tokens)) {
      expect(screen.getByText(`--${token}`)).toBeInTheDocument();
    }
  });

  it("incluye la atribución de TMDB en el pie", () => {
    render(<HomePage />);
    const footer = screen.getByRole("contentinfo");
    expect(within(footer).getByRole("img", { name: "Logo de TMDB" })).toBeInTheDocument();
    expect(footer).toHaveTextContent("no está respaldado ni certificado por TMDB");
  });
});
