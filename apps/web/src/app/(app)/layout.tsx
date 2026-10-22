import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/components/shell/app-shell";
import { TmdbAttribution } from "@/components/tmdb-attribution";
import { getSessionUser } from "@/lib/session";

/** Zona con sesión: sidebar/barra inferior, contenido con padding de 40px en escritorio y pie TMDB. */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <AppShell user={user}>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 lg:px-10 lg:py-10">
        {children}
      </main>
      <TmdbAttribution />
    </AppShell>
  );
}
