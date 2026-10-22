"use client";

import { Button } from "@watchlog/ui/components/button";
import { X } from "lucide-react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Poster } from "./poster";

export type ToastAction = { label: string; onClick: () => void; variant?: "brand" | "ghost" };

export type ToastOptions = {
  title: string;
  description?: string;
  /** Miniatura del póster (docs/design: el toast lleva la miniatura del título). */
  posterUrl?: string | null;
  actions?: ToastAction[];
  /** Milisegundos; por defecto 7 s. */
  duration?: number;
};

type ToastState = ToastOptions & { id: number };

const ToastContext = createContext<{ show: (toast: ToastOptions) => void; dismiss: () => void } | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return context;
}

/**
 * Toast de "añadido / deshacer" (HANDOFF §4): popover con `shadow-lg`, miniatura, título,
 * texto y acciones. Uno a la vez; se cierra solo y se pausa con el ratón o el foco encima.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [paused, setPaused] = useState(false);
  const nextId = useRef(0);

  const dismiss = useCallback(() => setToast(null), []);
  const show = useCallback((options: ToastOptions) => {
    nextId.current += 1;
    setPaused(false);
    setToast({ ...options, id: nextId.current });
  }, []);

  useEffect(() => {
    if (!toast || paused) return;
    const timer = setTimeout(dismiss, toast.duration ?? 7000);
    return () => clearTimeout(timer);
  }, [toast, paused, dismiss]);

  const value = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-24 z-40 flex justify-center lg:inset-x-auto lg:right-10 lg:bottom-10"
      >
        {toast && (
          <div
            key={toast.id}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
            className="bg-popover border-border animate-in fade-in-0 slide-in-from-bottom-2 pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xl border p-3 shadow-lg"
          >
            {toast.posterUrl !== undefined && (
              <Poster url={toast.posterUrl} title={toast.title} className="w-8" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-small truncate font-semibold">{toast.title}</p>
              {toast.description && (
                <p className="text-caption text-muted-foreground font-normal">{toast.description}</p>
              )}
            </div>
            {toast.actions?.map((action) => (
              <Button
                key={action.label}
                size="sm"
                variant={action.variant ?? "ghost"}
                onClick={() => {
                  dismiss();
                  action.onClick();
                }}
              >
                {action.label}
              </Button>
            ))}
            <button
              type="button"
              onClick={dismiss}
              className="text-subtle-foreground hover:text-foreground hidden rounded-md p-1 sm:block"
            >
              <X aria-hidden="true" className="size-4" />
              <span className="sr-only">Cerrar aviso</span>
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
