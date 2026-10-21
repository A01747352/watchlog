import type { ReactNode } from "react";

/** Contenedor de login y registro (pantallas aún sin mockup: solo tokens existentes). */
export function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-page">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <div className="bg-card border-border flex flex-col gap-5 rounded-xl border p-6 shadow-md">
        {children}
      </div>
    </div>
  );
}
