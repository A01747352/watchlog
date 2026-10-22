"use client";

import { Dialog, DialogContent, DialogTitle } from "@watchlog/ui/components/dialog";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { SearchPanel } from "../search/search-panel";

/** Estado del ⌘K: Cmd+K (macOS) o Ctrl+K abre y cierra; no se abre en la propia página de búsqueda. */
export function useCommandSearch() {
  const pathname = usePathname();
  /** Ruta en la que se abrió: al navegar deja de coincidir y el diálogo se cierra solo. */
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = openedAt === pathname;
  const setOpen = (next: boolean) => setOpenedAt(next ? pathname : null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (pathname === "/search") {
          document.querySelector<HTMLInputElement>('input[role="combobox"]')?.focus();
          return;
        }
        setOpenedAt((current) => (current === pathname ? null : pathname));
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pathname]);

  return { open, onOpenChange: setOpen };
}

/** Búsqueda como CommandDialog (HANDOFF §5.3): el mismo panel que /search, en un diálogo. */
export function CommandSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showClose={false}
        aria-describedby={undefined}
        className="sm:top-24 sm:max-w-2xl sm:translate-y-0"
      >
        <DialogTitle className="sr-only">Buscar</DialogTitle>
        <div className="max-h-[80dvh] overflow-y-auto p-4">
          <SearchPanel variant="dialog" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
