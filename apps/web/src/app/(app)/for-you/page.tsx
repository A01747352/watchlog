import { Sparkles } from "lucide-react";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/coming-soon";
import { PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Para ti" };

export default function ForYouPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Para ti" />
      <ComingSoon icon={Sparkles} title="Tus recomendaciones llegan pronto">
        Cuando califiques unos cuantos títulos, aquí verás sugerencias con el porqué de cada una.
      </ComingSoon>
    </div>
  );
}
