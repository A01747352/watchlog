import type * as React from "react";

import { cn } from "../lib/utils";

/** Área de texto con el mismo foco que Input (borde `ring` + halo de 3px). */
export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input bg-background text-body placeholder:text-subtle-foreground flex w-full min-w-0 resize-none rounded-lg border px-3.5 py-3 transition-[border-color,box-shadow] outline-none",
        "focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-3 focus-visible:outline-none",
        "aria-invalid:border-destructive disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
