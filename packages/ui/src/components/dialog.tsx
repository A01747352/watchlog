"use client";

import { X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import type * as React from "react";

import { cn } from "../lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

/**
 * Diálogo (shadcn/ui sobre Radix) con las medidas de docs/design: centrado en escritorio
 * (por defecto 560px, radio 2xl, `shadow-lg`) y hoja inferior en móvil, con asa.
 * Radix gestiona el foco, Escape y el bloqueo del scroll.
 */
export function DialogContent({
  className,
  children,
  showClose = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { showClose?: boolean }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        data-slot="dialog-overlay"
        className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-overlay"
      />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "bg-popover text-popover-foreground border-border fixed z-50 flex flex-col shadow-lg outline-none",
          // Móvil: hoja inferior
          "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-2xl border-t pb-[max(1.5rem,env(safe-area-inset-bottom))]",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
          // Escritorio: centrado
          "sm:inset-auto sm:top-1/2 sm:left-1/2 sm:max-h-[90dvh] sm:w-[calc(100%-2rem)] sm:max-w-140 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border sm:pb-0",
          "sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:zoom-out-95",
          className,
        )}
        {...props}
      >
        <div
          aria-hidden="true"
          className="bg-border mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full sm:hidden"
        />
        {children}
        {showClose && (
          <DialogPrimitive.Close className="text-muted-foreground hover:bg-accent hover:text-foreground absolute top-4 right-4 hidden size-9 items-center justify-center rounded-lg sm:flex">
            <X aria-hidden="true" className="size-4" />
            <span className="sr-only">Cerrar</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title data-slot="dialog-title" className={cn("text-h3", className)} {...props} />;
}

export function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-small text-muted-foreground", className)}
      {...props}
    />
  );
}
