import { ChartColumn } from "lucide-react";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/coming-soon";
import { PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Estadísticas" };

export default function StatsPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Estadísticas" />
      <ComingSoon icon={ChartColumn} title="Tus estadísticas llegan pronto">
        Horas vistas, géneros favoritos y tu actividad por mes, a partir de lo que registres.
      </ComingSoon>
    </div>
  );
}
