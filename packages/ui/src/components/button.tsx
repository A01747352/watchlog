import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type * as React from "react";

import { cn } from "../lib/utils";

/** Botón base (shadcn/ui) con las medidas y estilos de docs/design. Primario = tinta invertida. */
export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg text-body font-emphasis transition-[background-color,opacity,color] cursor-pointer disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground font-semibold hover:opacity-90",
        secondary: "border border-border bg-secondary text-secondary-foreground hover:bg-accent",
        outline: "border border-border bg-transparent hover:bg-accent",
        ghost: "text-muted-foreground hover:bg-accent hover:text-foreground",
        brand: "bg-brand text-brand-foreground font-semibold hover:opacity-90",
        destructive: "border border-border bg-transparent text-destructive hover:bg-accent",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 rounded-md px-3 text-small",
        icon: "size-10",
        touch: "size-11",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Renderiza el hijo (p. ej. un <Link>) con los estilos del botón. */
    asChild?: boolean;
  };

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
