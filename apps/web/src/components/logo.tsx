import Link from "next/link";

/** Logotipo de docs/design: cuadrado `brand` con un punto del color del fondo + "Watchlog". */
export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 rounded-md">
      <span aria-hidden="true" className="bg-brand flex size-6 items-center justify-center rounded-md">
        <span className="bg-background size-2.25 rounded-full" />
      </span>
      <span className="font-display text-h2">Watchlog</span>
    </Link>
  );
}
