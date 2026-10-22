import { cva } from "class-variance-authority";
import { Check, Clock, Pause, Play, X } from "lucide-react";

import { cn } from "../lib/utils";

export type LibraryStatus = "PLANNED" | "WATCHING" | "COMPLETED" | "ON_HOLD" | "DROPPED";

/** Icono lucide y etiqueta de cada estado (HANDOFF §4, StatusBadge). */
export const statusMeta: Record<LibraryStatus, { label: string; icon: typeof Check }> = {
  PLANNED: { label: "Pendiente", icon: Clock },
  WATCHING: { label: "Viendo", icon: Play },
  COMPLETED: { label: "Terminado", icon: Check },
  ON_HOLD: { label: "En pausa", icon: Pause },
  DROPPED: { label: "Abandonado", icon: X },
};

const statusBadgeVariants = cva("inline-flex shrink-0 items-center gap-1.5 text-caption font-semibold", {
  variants: {
    status: {
      PLANNED: "text-status-pending",
      WATCHING: "text-status-watching",
      COMPLETED: "text-status-completed",
      ON_HOLD: "text-status-paused",
      DROPPED: "text-status-dropped",
    },
    variant: {
      plain: "",
      outline: "h-6 rounded-full border border-current/40 px-2.5",
      onPoster: "bg-on-poster text-on-poster-foreground h-6 rounded-full px-2 backdrop-blur-[6px]",
    },
  },
});

/** Estado en la biblioteca: icono (decorativo) + texto, nunca solo color. */
export function StatusBadge({
  status,
  variant = "plain",
  className,
}: {
  status: LibraryStatus;
  variant?: "plain" | "outline" | "onPoster";
  className?: string;
}) {
  const { label, icon: Icon } = statusMeta[status];
  return (
    <span data-slot="status-badge" className={cn(statusBadgeVariants({ status, variant }), className)}>
      <Icon aria-hidden="true" className="size-3.5" />
      {label}
    </span>
  );
}
