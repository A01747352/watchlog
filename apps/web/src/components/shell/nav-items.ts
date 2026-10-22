import { ChartColumn, Library, Search, Sparkles } from "lucide-react";

/** Navegación principal (HANDOFF §3). `short` es la etiqueta de la barra inferior en móvil. */
export const navItems = [
  { href: "/", label: "Biblioteca", short: "Biblioteca", icon: Library },
  { href: "/for-you", label: "Para ti", short: "Para ti", icon: Sparkles },
  { href: "/search", label: "Buscar", short: "Buscar", icon: Search },
  { href: "/stats", label: "Estadísticas", short: "Stats", icon: ChartColumn },
] as const;

export const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
