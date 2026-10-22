import { Check } from "lucide-react";
import type * as React from "react";

import { cn } from "../lib/utils";

/**
 * Píldora conmutable (etiquetas, filtros de estado). Activa = rellena con tinta (docs/design,
 * FilterBar y Calificar). Siempre con `aria-pressed`.
 */
export function Chip({
  pressed,
  showCheck = true,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"button">, "aria-pressed"> & { pressed: boolean; showCheck?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      data-slot="chip"
      className={cn(
        "text-small inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 font-medium transition-colors",
        pressed
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
        className,
      )}
      {...props}
    >
      {pressed && showCheck && <Check aria-hidden="true" className="size-3.5" />}
      {children}
    </button>
  );
}
