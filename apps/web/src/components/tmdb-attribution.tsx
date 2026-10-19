/** Pie obligatorio en todas las pantallas (HANDOFF §3, condiciones de uso de TMDB). */
export function TmdbAttribution() {
  return (
    <footer className="border-border text-caption text-subtle-foreground flex flex-wrap items-center gap-4 border-t px-4 py-4.5 font-normal lg:px-10">
      {/* Placeholder del diseño hasta incorporar el logo oficial de TMDB (Fase 5). */}
      <div
        role="img"
        aria-label="Logo de TMDB"
        className="border-input text-subtle-foreground flex h-6.5 w-19 shrink-0 items-center justify-center rounded-xs border border-dashed bg-[repeating-linear-gradient(135deg,var(--muted)_0_4px,transparent_4px_8px)] font-mono text-caption"
      >
        logo TMDB
      </div>
      <p>Este producto usa la API de TMDB, pero no está respaldado ni certificado por TMDB.</p>
    </footer>
  );
}
