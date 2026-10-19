import { render, screen } from "@testing-library/react";

import { Button } from "./button";

describe("Button", () => {
  it("usa el primario (tinta invertida) por defecto", () => {
    render(<Button>Registrar</Button>);
    const button = screen.getByRole("button", { name: "Registrar" });
    expect(button).toHaveClass("bg-primary", "text-primary-foreground", "rounded-lg", "h-10");
  });

  it("aplica la variante secundaria", () => {
    render(<Button variant="secondary">Secundario</Button>);
    expect(screen.getByRole("button", { name: "Secundario" })).toHaveClass("bg-secondary", "border-border");
  });

  it("con asChild pinta el hijo con los estilos del botón", () => {
    render(
      <Button asChild variant="ghost">
        <a href="/library">Biblioteca</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Biblioteca" });
    expect(link).toHaveAttribute("href", "/library");
    expect(link).toHaveClass("text-muted-foreground");
  });
});
