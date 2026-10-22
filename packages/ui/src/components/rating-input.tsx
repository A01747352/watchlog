"use client";

import { type KeyboardEvent, type MouseEvent, useState } from "react";

import { cn } from "../lib/utils";

/** Palabra de cada nota (HANDOFF §4): índice = parte entera. */
const WORDS = [
  "",
  "Terrible",
  "Muy mala",
  "Mala",
  "Floja",
  "Regular",
  "Correcta",
  "Buena",
  "Muy buena",
  "Excelente",
  "Obra maestra",
] as const;

const clamp = (value: number) => Math.min(10, Math.max(1, Math.round(value * 2) / 2));
export const formatRating = (value: number) => (value === 10 ? "10" : value.toFixed(1));
export const ratingWordFor = (value: number) => WORDS[Math.floor(clamp(value))] ?? "";

/**
 * Nota según la celda y la mitad a la que apunta el ratón (mitad izquierda = x.5), o `null` si
 * apunta al hueco entre celdas. Los eventos se escuchan en el slider (que ya gestiona el teclado)
 * y la celda se averigua por `data-cell`.
 */
function pick(event: MouseEvent<HTMLElement>) {
  const cell = (event.target as HTMLElement).closest<HTMLElement>("[data-cell]");
  if (!cell) return null;
  const index = Number(cell.dataset.cell);
  const rect = cell.getBoundingClientRect();
  const leftHalf = event.clientX - rect.left < rect.width / 2;
  return Math.max(1, index + (leftHalf ? 0.5 : 1));
}

export type RatingInputProps = {
  value: number | null;
  onChange: (value: number) => void;
  /** Nombre accesible del control. */
  label?: string;
  className?: string;
};

/**
 * Nota de 1 a 10 en pasos de 0.5 (docs/design, RatingInput). Diez celdas que se rellenan;
 * clic en la mitad izquierda = medio punto; el ratón previsualiza. `role="slider"` con teclado:
 * ←/↓ −0.5 · →/↑ +0.5 · 1–9 directo · 0 o Fin = 10 · Inicio = 1. En móvil, botones −/+.
 */
export function RatingInput({ value, onChange, label = "Mi nota", className }: RatingInputProps) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value;

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const current = value ?? 0;
    const next = (() => {
      switch (event.key) {
        case "ArrowRight":
        case "ArrowUp":
          return current + 0.5;
        case "ArrowLeft":
        case "ArrowDown":
          return current - 0.5;
        case "Home":
          return 1;
        case "End":
        case "0":
          return 10;
        default:
          return /^[1-9]$/.test(event.key) ? Number(event.key) : null;
      }
    })();
    if (next === null) return;
    event.preventDefault();
    onChange(clamp(next));
  }

  const step = (delta: number) => onChange(clamp((value ?? (delta > 0 ? 0.5 : 10.5)) + delta));

  return (
    <div className={cn("flex flex-col gap-3", className)} data-slot="rating-input">
      <div className="flex items-end justify-between gap-4" aria-hidden="true">
        <p className="flex items-baseline gap-2">
          <span
            className={cn(
              "font-display text-rating tabular-nums transition-colors",
              hover !== null
                ? "text-muted-foreground"
                : shown === null
                  ? "text-subtle-foreground"
                  : "text-brand",
            )}
          >
            {shown === null ? "–" : formatRating(shown)}
          </span>
          <span className="text-small text-subtle-foreground font-mono">/10</span>
        </p>
        <p className="text-body font-emphasis text-muted-foreground">
          {shown === null ? "Sin nota" : ratingWordFor(shown)}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Bajar medio punto"
          onClick={() => step(-0.5)}
          className="border-border hover:bg-accent flex size-12 shrink-0 items-center justify-center rounded-xl border sm:hidden"
        >
          <span aria-hidden="true" className="text-h3 leading-none">
            −
          </span>
        </button>

        <div
          role="slider"
          tabIndex={0}
          aria-label={label}
          aria-valuemin={1}
          aria-valuemax={10}
          aria-valuenow={value ?? undefined}
          aria-valuetext={
            value === null ? "Sin nota" : `${formatRating(value)} de 10, ${ratingWordFor(value)}`
          }
          onKeyDown={onKeyDown}
          onMouseMove={(event) => {
            const next = pick(event);
            if (next !== null && next !== hover) setHover(next);
          }}
          onClick={(event) => {
            const next = pick(event);
            if (next === null) return;
            onChange(next);
            setHover(null);
          }}
          onMouseLeave={() => setHover(null)}
          className="grid flex-1 cursor-pointer grid-cols-10 gap-1.25 rounded-md"
        >
          {Array.from({ length: 10 }, (_, index) => {
            const fill = Math.min(1, Math.max(0, (shown ?? 0) - index));
            return (
              <div
                key={index}
                data-cell={index}
                className="bg-secondary relative h-11 overflow-hidden rounded-md"
              >
                <div className="bg-brand absolute inset-y-0 left-0" style={{ width: `${fill * 100}%` }} />
                <span
                  className={cn(
                    "text-caption absolute inset-0 hidden items-center justify-center font-mono sm:flex",
                    fill >= 1 ? "text-brand-foreground" : "text-subtle-foreground",
                  )}
                >
                  {index + 1}
                </span>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          aria-label="Subir medio punto"
          onClick={() => step(0.5)}
          className="border-border hover:bg-accent flex size-12 shrink-0 items-center justify-center rounded-xl border sm:hidden"
        >
          <span aria-hidden="true" className="text-h3 leading-none">
            +
          </span>
        </button>
      </div>

      <div
        className="text-caption text-subtle-foreground hidden justify-between font-normal sm:flex"
        aria-hidden="true"
      >
        <span>Mitad izquierda = ,5</span>
        <span>← → con el teclado</span>
      </div>
    </div>
  );
}
