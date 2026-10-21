import { Library } from "lucide-react";

import { InvitePanel } from "@/components/invite-panel";
import { getSessionUser } from "@/lib/session";

/**
 * Inicio con sesión. La Biblioteca (grid de pósters, filtros) llega en las Fases 4-5;
 * mientras tanto se muestra su estado vacío según docs/design (HANDOFF §4, Estados).
 */
export default async function HomePage() {
  const user = await getSessionUser();

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-page">Hola, {user?.name}</h1>
        <p className="text-muted-foreground">Tu biblioteca</p>
      </div>

      <div className="border-border flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center">
        <span className="bg-secondary flex size-14 items-center justify-center rounded-xl" aria-hidden="true">
          <Library className="text-muted-foreground size-6" />
        </span>
        <h2 className="font-display text-h2">Aún no hay nada aquí</h2>
        <p className="text-muted-foreground max-w-sm">
          Pronto podrás buscar películas, series y anime y registrar lo último que viste.
        </p>
      </div>

      <InvitePanel />
    </div>
  );
}
