import { render, screen } from "@testing-library/react";

import { Input } from "./input";
import { Label } from "./label";

describe("Input + Label", () => {
  it("se asocian por htmlFor y usan los tokens del diseño", () => {
    render(
      <>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" />
      </>,
    );
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("type", "email");
    expect(input).toHaveClass("h-10", "rounded-md", "border-input", "focus-visible:border-ring");
  });

  it("marca el estado inválido con aria-invalid", () => {
    render(<Input aria-label="Código" aria-invalid />);
    expect(screen.getByLabelText("Código")).toHaveClass("aria-invalid:border-destructive");
  });
});
