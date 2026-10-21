import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { Logo } from "@/components/logo";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { TmdbAttribution } from "@/components/tmdb-attribution";
import { getSessionUser } from "@/lib/session";

/**
 * Zona con sesión. La sidebar y la barra inferior del diseño llegan con la Biblioteca (Fase 4-5);
 * por ahora, una cabecera mínima con los tokens existentes.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-border flex items-center justify-between gap-4 border-b px-4 py-3 lg:px-10">
        <Logo />
        <div className="flex items-center gap-2">
          <span className="text-small text-muted-foreground hidden sm:inline">{user.email}</span>
          <ThemeToggle />
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 lg:px-10 lg:py-10">
        {children}
      </main>
      <TmdbAttribution />
    </div>
  );
}
