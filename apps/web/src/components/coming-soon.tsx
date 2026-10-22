import type { LucideIcon } from "lucide-react";

/**
 * Estado vacío (HANDOFF §4, Estados: icono en cuadro de 56px, h2 y texto) para pantallas cuyo
 * diseño aún está pendiente.
 */
export function ComingSoon({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: string;
}) {
  return (
    <div className="border-border flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
      <span aria-hidden="true" className="bg-secondary flex size-14 items-center justify-center rounded-xl">
        <Icon className="text-muted-foreground size-6" />
      </span>
      <h2 className="font-display text-h2">{title}</h2>
      <p className="text-muted-foreground max-w-sm">{children}</p>
    </div>
  );
}
