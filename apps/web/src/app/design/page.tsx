import { Button } from "@watchlog/ui/components/button";
import { TypeBadge } from "@watchlog/ui/components/type-badge";
import {
  colorTokenGroups,
  mediaTypes,
  radiusTokens,
  shadowTokens,
  spacingScale,
  typeScale,
  type ColorToken,
} from "@watchlog/ui/tokens";
import { Plus } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { TmdbAttribution } from "@/components/tmdb-attribution";

export const metadata: Metadata = { title: "Sistema de diseño" };

/*
 * Página del sistema de diseño (/design): comprueba que los tokens de packages/ui llegan a
 * Tailwind en ambos temas. Pública; sirve de referencia viva de los tokens.
 * Las clases se listan completas para que Tailwind las detecte al escanear el código.
 */

const swatchClass: Record<ColorToken, string> = {
  background: "bg-background",
  card: "bg-card",
  popover: "bg-popover",
  secondary: "bg-secondary",
  muted: "bg-muted",
  accent: "bg-accent",
  border: "bg-border",
  input: "bg-input",
  sidebar: "bg-sidebar",
  foreground: "bg-foreground",
  "muted-foreground": "bg-muted-foreground",
  "subtle-foreground": "bg-subtle-foreground",
  primary: "bg-primary",
  brand: "bg-brand",
  ring: "bg-ring",
  destructive: "bg-destructive",
  "type-movie": "bg-movie",
  "type-series": "bg-series",
  "type-anime": "bg-anime",
  "status-pending": "bg-status-pending",
  "status-watching": "bg-status-watching",
  "status-completed": "bg-status-completed",
  "status-paused": "bg-status-paused",
  "status-dropped": "bg-status-dropped",
};

const typeScaleClass: Record<(typeof typeScale)[number]["name"], string> = {
  display: "font-display text-display",
  page: "font-display text-page",
  h1: "font-display text-h1",
  h2: "font-display text-h2",
  h3: "font-sans text-h3",
  body: "font-sans text-body",
  small: "font-sans text-small text-muted-foreground",
  caption: "font-mono text-caption text-muted-foreground",
};

const typeSample: Record<(typeof typeScale)[number]["name"], string> = {
  display: "Biblioteca",
  page: "Para ti",
  h1: "Frieren: Beyond Journey’s End",
  h2: "Porque calificaste Frieren con 9.5",
  h3: "Reparto y estudio",
  body: "Una maga elfa reflexiona sobre el paso del tiempo tras la muerte de sus compañeros.",
  small: "Fantasía · Aventura · 28 episodios",
  caption: "2023 · E18/28 · 9.5",
};

const radiusClass: Record<keyof typeof radiusTokens, string> = {
  xs: "rounded-xs",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
};

const spacingClass: Record<(typeof spacingScale)[number], string> = {
  8: "w-2",
  12: "w-3",
  16: "w-4",
  20: "w-5",
  24: "w-6",
  32: "w-8",
  40: "w-10",
};

const shadowClass: Record<(typeof shadowTokens)[number], string> = {
  "shadow-sm": "shadow-sm",
  "shadow-md": "shadow-md",
  "shadow-lg": "shadow-lg",
  "shadow-poster": "shadow-poster",
};

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-5">
      <h2 id={id} className="font-display text-h2">
        {title}
      </h2>
      {children}
    </section>
  );
}

function TokenLabel({ children }: { children: ReactNode }) {
  return <code className="text-caption text-muted-foreground font-mono">{children}</code>;
}

export default function DesignSystemPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-border flex items-center justify-between gap-4 border-b px-4 py-3 lg:px-10">
        <div className="flex items-center gap-2.5">
          <span aria-hidden="true" className="bg-brand flex size-6 items-center justify-center rounded-md">
            <span className="bg-background size-2.25 rounded-full" />
          </span>
          <span className="font-display text-h2">Watchlog</span>
        </div>
        <ThemeToggle />
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-14 px-4 py-8 lg:px-10 lg:py-10">
        <div className="flex flex-col gap-4">
          <p className="text-caption text-subtle-foreground font-mono">sistema de diseño · fase 1</p>
          <h1 className="font-display text-page max-w-3xl text-pretty">
            Una interfaz oscura y silenciosa que enmarca los pósters.
          </h1>
          <p className="text-muted-foreground max-w-2xl text-pretty">
            Neutros fríos casi sin saturación, un único acento cálido para foco y nota, y tres colores de tipo
            que siempre van con forma y texto. Esta página comprueba que los tokens de{" "}
            <code className="text-small font-mono">@watchlog/ui</code> llegan a Tailwind en ambos temas.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button>
              <Plus aria-hidden="true" />
              Registrar
            </Button>
            <Button variant="secondary">Secundario</Button>
            <Button variant="ghost">Fantasma</Button>
            <Button variant="destructive" size="sm">
              Eliminar
            </Button>
          </div>
        </div>

        <Section id="color" title="Color">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {colorTokenGroups.map((group) => (
              <div key={group.name} className="flex flex-col gap-3">
                <h3 className="text-h3">{group.name}</h3>
                <ul className="flex flex-col gap-2">
                  {group.tokens.map((token) => (
                    <li key={token} className="flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className={`border-border size-9 shrink-0 rounded-md border shadow-sm ${swatchClass[token]}`}
                      />
                      <TokenLabel>--{token}</TokenLabel>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        <Section id="tipo-contenido" title="Tipo de contenido">
          <p className="text-muted-foreground max-w-2xl">
            Nunca se usa el color solo: cuadrado = Película, círculo = Serie, rombo = Anime, siempre con su
            etiqueta.
          </p>
          <div className="flex flex-wrap items-center gap-6">
            {mediaTypes.map((type) => (
              <TypeBadge key={type} type={type} />
            ))}
            {mediaTypes.map((type) => (
              <TypeBadge key={`${type}-pill`} type={type} variant="pill" />
            ))}
          </div>
          <ul className="grid max-w-md grid-cols-3 gap-4">
            {mediaTypes.map((type, index) => (
              <li key={type} className="flex flex-col gap-2">
                <div
                  aria-hidden="true"
                  className={`bg-muted aspect-poster shadow-poster rounded-md ${index === 2 ? "animate-skeleton" : ""}`}
                />
                <TypeBadge type={type} />
              </li>
            ))}
          </ul>
        </Section>

        <Section id="tipografia" title="Tipografía">
          <p className="text-muted-foreground max-w-2xl">
            Bricolage Grotesque para titulares, Geist para la interfaz y Geist Mono para notas, años y
            episodios.
          </p>
          <ul className="divide-border flex flex-col divide-y">
            {typeScale.map((style) => (
              <li
                key={style.name}
                className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:gap-6"
              >
                <span className="w-56 shrink-0">
                  <TokenLabel>
                    text-{style.name} · {style.spec}
                  </TokenLabel>
                </span>
                <span className={`min-w-0 text-pretty ${typeScaleClass[style.name]}`}>
                  {typeSample[style.name]}
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <div className="grid gap-14 lg:grid-cols-3">
          <Section id="radios" title="Radios">
            <ul className="flex flex-wrap gap-4">
              {Object.entries(radiusTokens).map(([name, px]) => (
                <li key={name} className="flex flex-col items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={`bg-secondary border-border size-12 border ${radiusClass[name as keyof typeof radiusTokens]}`}
                  />
                  <TokenLabel>
                    {name} {px}
                  </TokenLabel>
                </li>
              ))}
            </ul>
          </Section>

          <Section id="espaciado" title="Espaciado · base 4px">
            <ul className="flex flex-col gap-2">
              {spacingScale.map((px) => (
                <li key={px} className="flex items-center gap-3">
                  <span aria-hidden="true" className={`bg-brand h-3 rounded-xs ${spacingClass[px]}`} />
                  <TokenLabel>{px}px</TokenLabel>
                </li>
              ))}
            </ul>
          </Section>

          <Section id="sombras" title="Sombras">
            <ul className="grid grid-cols-2 gap-5">
              {shadowTokens.map((token) => (
                <li key={token} className="flex flex-col gap-2">
                  <span aria-hidden="true" className={`bg-card h-14 rounded-xl ${shadowClass[token]}`} />
                  <TokenLabel>--{token}</TokenLabel>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </main>

      <TmdbAttribution />
    </div>
  );
}
