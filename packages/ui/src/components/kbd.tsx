import type * as React from "react";

import { cn } from "../lib/utils";

/** Tecla (atajos de la búsqueda y ⌘K). */
export function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "border-border text-subtle-foreground inline-flex h-5 min-w-5 items-center justify-center rounded-sm border px-1 font-mono text-caption",
        className,
      )}
      {...props}
    />
  );
}
