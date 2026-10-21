import type { ReactNode } from "react";

import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { TmdbAttribution } from "@/components/tmdb-attribution";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between gap-4 px-4 py-3 lg:px-10">
        <Logo href="/login" />
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-10 lg:items-center">{children}</main>
      <TmdbAttribution />
    </div>
  );
}
