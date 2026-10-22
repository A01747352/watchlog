import { render, screen } from "@testing-library/react";

import { Chip } from "./chip";
import { StatusBadge } from "./status-badge";

describe("Chip", () => {
  it("expone su estado con aria-pressed y se rellena de tinta al activarse", () => {
    const { rerender } = render(<Chip pressed={false}>Lloré</Chip>);
    const chip = screen.getByRole("button", { name: "Lloré" });
    expect(chip).toHaveAttribute("aria-pressed", "false");
    rerender(<Chip pressed>Lloré</Chip>);
    expect(chip).toHaveAttribute("aria-pressed", "true");
    expect(chip).toHaveClass("bg-primary");
  });
});

describe("StatusBadge", () => {
  it.each([
    ["COMPLETED", "Terminado", "text-status-completed"],
    ["PLANNED", "Pendiente", "text-status-pending"],
    ["DROPPED", "Abandonado", "text-status-dropped"],
  ] as const)("%s muestra texto y color de estado", (status, label, color) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(label)).toHaveClass(color);
  });
});
