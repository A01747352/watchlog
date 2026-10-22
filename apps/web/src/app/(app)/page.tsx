import { Button } from "@watchlog/ui/components/button";
import { Library, Search } from "lucide-react";
import Link from "next/link";

import { InvitePanel } from "@/components/invite-panel";
import { PageHeader } from "@/components/shell/page-header";
import { getSessionUser } from "@/lib/session";

/**
 * Biblioteca. La vista con grid de pósters y filtros llega en la Fase 5; mientras tanto, el
 * estado vacío del diseño (HANDOFF §4, Estados) con su CTA a registrar.
 */
export default async function HomePage() {
  const user = await getSessionUser();

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Biblioteca"
        description={`Hola, ${user?.name ?? ""}`}
        actions={
          <Button asChild className="hidden sm:inline-flex">
            <Link href="/search">
              <Search aria-hidden="true" />
              Registrar
            </Link>
          </Button>
        }
      />

      <div className="border-border flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center">
        <span className="bg-secondary flex size-14 items-center justify-center rounded-xl" aria-hidden="true">
          <Library className="text-muted-foreground size-6" />
        </span>
        <h2 className="font-display text-h2">Aún no hay nada aquí</h2>
        <p className="text-muted-foreground max-w-sm">Registra lo último que viste.</p>
        <Button asChild>
          <Link href="/search">Registrar</Link>
        </Button>
      </div>

      <InvitePanel />
    </div>
  );
}
