import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import { formatRating, RatingInput, ratingWordFor } from "./rating-input";

function Controlled({
  initial = null,
  onChange = () => {},
}: {
  initial?: number | null;
  onChange?: (v: number) => void;
}) {
  const [value, setValue] = useState<number | null>(initial);
  return (
    <RatingInput
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

/** jsdom no maqueta: cada celda mide 40px para poder apuntar a su mitad izquierda o derecha. */
function cells() {
  const slider = screen.getByRole("slider");
  const list = Array.from(slider.children) as HTMLElement[];
  for (const cell of list) {
    cell.getBoundingClientRect = () => ({
      left: 0,
      width: 40,
      top: 0,
      height: 44,
      right: 40,
      bottom: 44,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
  }
  return list;
}

describe("RatingInput", () => {
  it("expone la nota como slider accesible con texto", () => {
    render(<Controlled initial={8.5} />);
    const slider = screen.getByRole("slider", { name: "Mi nota" });
    expect(slider).toHaveAttribute("aria-valuemin", "1");
    expect(slider).toHaveAttribute("aria-valuemax", "10");
    expect(slider).toHaveAttribute("aria-valuetext", "8.5 de 10, Muy buena");
  });

  it("sin nota muestra 'Sin nota'", () => {
    render(<Controlled />);
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuetext", "Sin nota");
  });

  it.each([
    ["{ArrowRight}", 8, 8.5],
    ["{ArrowUp}", 8, 8.5],
    ["{ArrowLeft}", 8, 7.5],
    ["{Home}", 8, 1],
    ["{End}", 8, 10],
    ["0", 8, 10],
    ["7", 8, 7],
    ["{ArrowLeft}", 1, 1],
    ["{ArrowRight}", 10, 10],
  ])("teclado %s desde %d → %d", async (key, initial, expected) => {
    const onChange = vi.fn();
    render(<Controlled initial={initial} onChange={onChange} />);
    screen.getByRole("slider").focus();
    await userEvent.keyboard(key);
    expect(onChange).toHaveBeenLastCalledWith(expected);
  });

  it("clic en la mitad izquierda de una celda = medio punto; en la derecha, entero", () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    const list = cells();
    fireEvent.click(list[8]!, { clientX: 10 });
    expect(onChange).toHaveBeenLastCalledWith(8.5);
    fireEvent.click(list[8]!, { clientX: 30 });
    expect(onChange).toHaveBeenLastCalledWith(9);
  });

  it("al pasar el ratón previsualiza la nota sin cambiarla", () => {
    const onChange = vi.fn();
    render(<Controlled initial={5} onChange={onChange} />);
    fireEvent.mouseMove(cells()[2]!, { clientX: 30 });
    expect(screen.getByText("3.0")).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.mouseLeave(screen.getByRole("slider"));
    expect(screen.getByText("5.0")).toBeInTheDocument();
  });

  it("los botones − y + de móvil suben y bajan medio punto", async () => {
    const onChange = vi.fn();
    render(<Controlled initial={9.5} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Subir medio punto" }));
    await userEvent.click(screen.getByRole("button", { name: "Subir medio punto" }));
    expect(onChange).toHaveBeenLastCalledWith(10);
    await userEvent.click(screen.getByRole("button", { name: "Bajar medio punto" }));
    expect(onChange).toHaveBeenLastCalledWith(9.5);
  });
});

describe("formatRating y ratingWordFor", () => {
  it.each([
    [10, "10", "Obra maestra"],
    [9.5, "9.5", "Excelente"],
    [7, "7.0", "Buena"],
    [1, "1.0", "Terrible"],
  ])("%d → %s, %s", (value, text, word) => {
    expect(formatRating(value)).toBe(text);
    expect(ratingWordFor(value)).toBe(word);
  });
});
