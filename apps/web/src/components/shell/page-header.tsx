import type { ReactNode } from "react";

import { SignOutButton } from "../sign-out-button";
import { ThemeToggle } from "../theme-toggle";

/** Cabecera de cada pantalla: título + acciones (en móvil, botones de 44×44; HANDOFF §3). */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="font-display text-page">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {actions}
        <ThemeToggle />
        {/* En móvil no hay sidebar: la salida va en la cabecera hasta que exista Perfil. */}
        <div className="lg:hidden">
          <SignOutButton compact />
        </div>
      </div>
    </header>
  );
}
