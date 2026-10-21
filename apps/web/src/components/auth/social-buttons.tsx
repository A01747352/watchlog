"use client";

import type { AuthProvidersResponse } from "@watchlog/contracts";
import { Button } from "@watchlog/ui/components/button";

export type SocialProvider = "github" | "google";

const labels: Record<SocialProvider, string> = { github: "GitHub", google: "Google" };

/** Botones OAuth; solo aparecen los proveedores configurados en la API. */
export function SocialButtons({
  providers,
  verb,
  disabled = false,
  onSelect,
}: {
  providers: AuthProvidersResponse;
  verb: string;
  disabled?: boolean;
  onSelect: (provider: SocialProvider) => void;
}) {
  const enabled = (["github", "google"] as const).filter((provider) => providers[provider]);
  if (enabled.length === 0) return null;

  return (
    <>
      <div className="text-caption text-subtle-foreground flex items-center gap-3 font-normal">
        <span aria-hidden="true" className="bg-border h-px flex-1" />o
        <span aria-hidden="true" className="bg-border h-px flex-1" />
      </div>
      <div className="flex flex-col gap-2">
        {enabled.map((provider) => (
          <Button
            key={provider}
            type="button"
            variant="secondary"
            disabled={disabled}
            onClick={() => onSelect(provider)}
          >
            {verb} con {labels[provider]}
          </Button>
        ))}
      </div>
    </>
  );
}
