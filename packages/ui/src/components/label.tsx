import type * as React from "react";

import { cn } from "../lib/utils";

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    // eslint-disable-next-line jsx-a11y/label-has-associated-control -- el control se asocia con htmlFor desde fuera
    <label data-slot="label" className={cn("text-small font-emphasis select-none", className)} {...props} />
  );
}
