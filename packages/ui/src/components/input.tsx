import type * as React from "react";

import { cn } from "../lib/utils";

/** Input base (shadcn/ui): alto 40, radio md; al enfocar, borde `ring` + halo de 3px (HANDOFF §4). */
export function Input({ className, type = "text", ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "border-input text-body placeholder:text-subtle-foreground flex h-10 w-full min-w-0 rounded-md border bg-transparent px-3 transition-[border-color,box-shadow] outline-none",
        "focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-3 focus-visible:outline-none",
        "aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
