"use client";

import type { SessionUser } from "@watchlog/contracts";
import { Kbd } from "@watchlog/ui/components/kbd";
import { cn } from "@watchlog/ui/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { RateDialogProvider } from "../library/rate-dialog-provider";
import { Logo } from "../logo";
import { SignOutButton } from "../sign-out-button";
import { ToastProvider } from "../toast";
import { CommandSearch, useCommandSearch } from "./command-search";
import { isActive, navItems } from "./nav-items";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

/**
 * Estructura de la zona con sesión (HANDOFF §3): sidebar fija de 240px en escritorio (≥1024)
 * y barra inferior de 4 ítems en móvil. ⌘K / Ctrl+K abre la búsqueda en cualquier pantalla.
 */
export function AppShell({ user, children }: { user: SessionUser; children: ReactNode }) {
  const pathname = usePathname();
  const command = useCommandSearch();

  return (
    <ToastProvider>
      <RateDialogProvider>
        <div className="flex min-h-dvh">
          <aside className="bg-sidebar border-sidebar-border sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r p-4 lg:flex">
            <div className="px-2 py-2">
              <Logo />
            </div>
            <nav aria-label="Principal" className="mt-6">
              <ul className="flex flex-col gap-1">
                {navItems.map(({ href, label, icon: Icon }) => {
                  const active = isActive(pathname, href);
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "text-body flex h-10 items-center gap-3 rounded-lg px-3 transition-colors",
                          active
                            ? "bg-accent text-accent-foreground font-emphasis"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground",
                        )}
                      >
                        <Icon aria-hidden="true" className={cn("size-4", active && "text-brand")} />
                        <span className="flex-1">{label}</span>
                        {href === "/search" && (
                          <span className="hidden xl:flex">
                            <Kbd>⌘K</Kbd>
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
            <div className="border-sidebar-border mt-auto flex items-center gap-3 rounded-xl border p-3">
              <span
                aria-hidden="true"
                className="bg-secondary text-caption flex size-9 shrink-0 items-center justify-center rounded-full font-semibold"
              >
                {initials(user.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-small truncate font-semibold">{user.name}</p>
                <p className="text-caption text-subtle-foreground truncate font-normal">{user.email}</p>
              </div>
            </div>
            <div className="mt-2">
              <SignOutButton />
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col pb-20 lg:pb-0">{children}</div>

          <nav
            aria-label="Principal"
            className="bg-sidebar border-sidebar-border fixed inset-x-0 bottom-0 z-30 border-t pb-[env(safe-area-inset-bottom)] lg:hidden"
          >
            <ul className="grid grid-cols-4">
              {navItems.map(({ href, short, icon: Icon }) => {
                const active = isActive(pathname, href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "text-caption flex min-h-14 flex-col items-center justify-center gap-1 font-medium",
                        active ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      <Icon aria-hidden="true" className={cn("size-5", active && "text-brand")} />
                      {short}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
        <CommandSearch {...command} />
      </RateDialogProvider>
    </ToastProvider>
  );
}
