import { act, render, screen } from "@testing-library/react";

import { ThemeProvider } from "./theme-provider";
import { ThemeToggle } from "./theme-toggle";

describe("ThemeToggle", () => {
  beforeAll(() => {
    // jsdom no implementa matchMedia; next-themes lo consulta al montar.
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  it("parte del tema oscuro y alterna a claro", async () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    const html = document.documentElement;
    expect(html).toHaveClass("dark");

    await act(async () => screen.getByRole("button").click());
    expect(html).toHaveClass("light");
    expect(html).not.toHaveClass("dark");
  });
});
