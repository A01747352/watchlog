import { render, screen } from "@testing-library/react";

import { TypeBadge } from "./type-badge";

describe("TypeBadge", () => {
  it.each([
    ["movie", "Película", "text-movie"],
    ["series", "Serie", "text-series"],
    ["anime", "Anime", "text-anime"],
  ] as const)("%s muestra texto, color y forma decorativa", (type, label, colorClass) => {
    const { container } = render(<TypeBadge type={type} />);
    expect(screen.getByText(label)).toHaveClass(colorClass);
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it("la variante pill lleva fondo del color de tipo", () => {
    render(<TypeBadge type="anime" variant="pill" />);
    expect(screen.getByText("Anime")).toHaveClass("rounded-full", "bg-anime/14");
  });
});
