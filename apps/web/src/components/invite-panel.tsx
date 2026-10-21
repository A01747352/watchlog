"use client";

import { createInviteResponseSchema } from "@watchlog/contracts";
import { Button } from "@watchlog/ui/components/button";
import { Input } from "@watchlog/ui/components/input";
import { Label } from "@watchlog/ui/components/label";
import { Check, Copy, UserPlus } from "lucide-react";
import { useState } from "react";

import { apiFetch } from "@/lib/api-client";

import { FormError } from "./form-error";

/** Crea una invitación (válida 7 días) y muestra el enlace de registro para copiarlo. */
export function InvitePanel() {
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);

  async function createInvite() {
    setPending(true);
    setError(null);
    setCopied(false);
    const result = await apiFetch("/api/invites", createInviteResponseSchema, { method: "POST" });
    setPending(false);
    if (!result.ok) return setError(result.error.message);
    setLink(`${window.location.origin}/signup?code=${result.data.code}`);
  }

  async function copy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
  }

  return (
    <section
      aria-labelledby="invite-title"
      className="bg-card border-border flex flex-col gap-4 rounded-xl border p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 id="invite-title" className="text-h3">
          Invita a un amigo
        </h2>
        <p className="text-small text-muted-foreground">
          Watchlog es solo por invitación. Cada enlace sirve para una cuenta y caduca en 7 días.
        </p>
      </div>
      {link ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="invite-link">Enlace de invitación</Label>
          <div className="flex gap-2">
            <Input
              id="invite-link"
              readOnly
              value={link}
              className="font-mono"
              onFocus={(e) => e.target.select()}
            />
            <Button variant="secondary" onClick={copy}>
              {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
              {copied ? "Copiado" : "Copiar"}
            </Button>
          </div>
        </div>
      ) : null}
      <FormError message={error} />
      <div>
        <Button variant={link ? "secondary" : "primary"} onClick={createInvite} disabled={pending}>
          <UserPlus aria-hidden="true" />
          {link ? "Crear otra invitación" : "Crear invitación"}
        </Button>
      </div>
    </section>
  );
}
