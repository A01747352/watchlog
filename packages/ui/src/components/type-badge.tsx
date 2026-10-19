import { cva } from "class-variance-authority";

import { cn } from "../lib/utils";
import type { MediaType } from "../tokens";

const labels: Record<MediaType, string> = { movie: "Película", series: "Serie", anime: "Anime" };

const typeBadgeVariants = cva("inline-flex items-center gap-1.5 text-caption font-semibold", {
  variants: {
    type: {
      movie: "text-movie",
      series: "text-series",
      anime: "text-anime",
    },
    variant: {
      inline: "",
      pill: "h-6 rounded-full px-2.5",
    },
  },
  compoundVariants: [
    { variant: "pill", type: "movie", class: "bg-movie/14" },
    { variant: "pill", type: "series", class: "bg-series/14" },
    { variant: "pill", type: "anime", class: "bg-anime/14" },
  ],
});

/** Forma por tipo: Película ■ · Serie ● · Anime ◆ (cuadrado rotado 45°). Decorativa. */
const shapeClass: Record<MediaType, string> = {
  movie: "rounded-[1.5px]",
  series: "rounded-full",
  anime: "rotate-45 rounded-[1px]",
};

export type TypeBadgeProps = {
  type: MediaType;
  variant?: "inline" | "pill";
  className?: string;
};

/** Tipo de contenido = color + forma + texto, siempre los tres (HANDOFF §1). */
export function TypeBadge({ type, variant = "inline", className }: TypeBadgeProps) {
  return (
    <span data-slot="type-badge" className={cn(typeBadgeVariants({ type, variant }), className)}>
      <span aria-hidden="true" className={cn("size-[7px] shrink-0 bg-current", shapeClass[type])} />
      {labels[type]}
    </span>
  );
}
