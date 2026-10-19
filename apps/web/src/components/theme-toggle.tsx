"use client";

import { Button } from "@watchlog/ui/components/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

/**
 * Alterna oscuro/claro. El icono y la etiqueta se eligen con CSS (variantes dark:/light:)
 * para que el HTML del servidor coincida con el del cliente.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="touch"
      onClick={() => setTheme(resolvedTheme === "light" ? "dark" : "light")}
    >
      <Sun aria-hidden="true" className="light:hidden" />
      <Moon aria-hidden="true" className="dark:hidden" />
      <span className="sr-only light:hidden">Cambiar a modo claro</span>
      <span className="sr-only dark:hidden">Cambiar a modo oscuro</span>
    </Button>
  );
}
