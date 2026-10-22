import { cn } from "@watchlog/ui/lib/utils";
import Image from "next/image";

/**
 * Póster 2:3 con radio md y `shadow-poster` (docs/design). Mientras carga, o si no hay imagen,
 * se ve el fondo `muted`. El ancho lo da `className` (p. ej. `w-10`).
 */
export function Poster({
  url,
  title,
  className,
  sizes = "64px",
}: {
  url: string | null;
  title: string;
  className?: string;
  sizes?: string;
}) {
  return (
    <div
      className={cn(
        "bg-muted aspect-poster shadow-poster relative shrink-0 overflow-hidden rounded-md",
        className,
      )}
    >
      {url && (
        // TMDB y AniList ya sirven el tamaño justo desde su CDN: sin pasar por el optimizador de Next.
        <Image src={url} alt={`Póster de ${title}`} fill sizes={sizes} unoptimized className="object-cover" />
      )}
    </div>
  );
}
