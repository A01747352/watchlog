"use client";

import type { LibraryEntry } from "@watchlog/contracts";
import { formatRating } from "@watchlog/ui/components/rating-input";
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";

import { useToast } from "../toast";
import { RateDialog } from "./rate-dialog";

type Listener = (entry: LibraryEntry) => void;

const RateDialogContext = createContext<{
  openRating: (entry: LibraryEntry, onSaved?: Listener) => void;
} | null>(null);

export function useRateDialog() {
  const context = useContext(RateDialogContext);
  if (!context) throw new Error("useRateDialog debe usarse dentro de <RateDialogProvider>");
  return context;
}

/**
 * Diálogo de calificar a nivel de la app: el toast puede pedirlo aunque la búsqueda que lo
 * originó (p. ej. el ⌘K) ya se haya cerrado.
 */
export function RateDialogProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [current, setCurrent] = useState<{ entry: LibraryEntry; onSaved?: Listener | undefined } | null>(
    null,
  );

  const openRating = useCallback(
    (entry: LibraryEntry, onSaved?: Listener) => setCurrent({ entry, onSaved }),
    [],
  );
  const value = useMemo(() => ({ openRating }), [openRating]);

  return (
    <RateDialogContext.Provider value={value}>
      {children}
      {current && (
        <RateDialog
          key={current.entry.id}
          entry={current.entry}
          open
          onOpenChange={(open) => !open && setCurrent(null)}
          onSaved={(entry) => {
            current.onSaved?.(entry);
            toast.show({
              title: entry.title.title,
              description:
                entry.rating === null ? "Guardado" : `Nota guardada: ${formatRating(entry.rating)}`,
              posterUrl: entry.title.posterUrl,
            });
          }}
        />
      )}
    </RateDialogContext.Provider>
  );
}
