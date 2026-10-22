import type { Metadata } from "next";

import { SearchPanel } from "@/components/search/search-panel";
import { PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Buscar" };

/** Buscar / añadir (docs/design, pantalla 3a/3b). */
export default function SearchPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader title="Buscar" />
      <SearchPanel />
    </div>
  );
}
