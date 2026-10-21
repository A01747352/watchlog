"use client";

import { type AuthProvidersResponse, verifyInviteResponseSchema } from "@watchlog/contracts";
import { Button } from "@watchlog/ui/components/button";
import { Input } from "@watchlog/ui/components/input";
import { Label } from "@watchlog/ui/components/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";

import { apiFetch } from "@/lib/api-client";
import { authClient, authErrorMessage } from "@/lib/auth-client";

import { FormError } from "../form-error";
import { type SocialProvider, SocialButtons } from "./social-buttons";

/**
 * Registro por invitación: primero se verifica el código (la API deja una cookie httpOnly)
 * y después Better Auth crea la cuenta por email o por OAuth.
 */
export function SignupForm({
  providers,
  initialCode,
  initialError,
}: {
  providers: AuthProvidersResponse;
  initialCode: string;
  initialError: string | null;
}) {
  const router = useRouter();
  const codeRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState(initialError);
  const [pending, setPending] = useState(false);

  async function verifyInvite() {
    const code = codeRef.current?.value.trim() ?? "";
    const result = await apiFetch("/api/invites/verify", verifyInviteResponseSchema, {
      method: "POST",
      body: JSON.stringify({ code }),
    });
    if (!result.ok) {
      setError(authErrorMessage(result.error.code, result.error.message));
      codeRef.current?.focus();
    }
    return result.ok;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);

    if (!(await verifyInvite())) return setPending(false);

    const { error } = await authClient.signUp.email({
      name: String(form.get("name")).trim(),
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    if (error) {
      setError(authErrorMessage(error.code, error.message));
      return setPending(false);
    }
    router.replace("/");
    router.refresh();
  }

  async function onSocial(provider: SocialProvider) {
    if (!codeRef.current?.reportValidity()) return;
    setPending(true);
    setError(null);
    if (!(await verifyInvite())) return setPending(false);

    const { error } = await authClient.signIn.social({
      provider,
      callbackURL: "/",
      newUserCallbackURL: "/",
      errorCallbackURL: "/signup",
    });
    if (error) {
      setError(authErrorMessage(error.code, error.message));
      setPending(false);
    }
  }

  return (
    <>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="code">Código de invitación</Label>
          <Input
            ref={codeRef}
            id="code"
            name="code"
            defaultValue={initialCode}
            autoComplete="off"
            spellCheck={false}
            required
            minLength={4}
            maxLength={64}
            pattern="[A-Za-z0-9_\-]+"
            className="font-mono"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Nombre</Label>
          <Input id="name" name="name" autoComplete="name" required maxLength={80} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            aria-describedby="password-hint"
          />
          <p id="password-hint" className="text-caption text-subtle-foreground font-normal">
            Mínimo 8 caracteres.
          </p>
        </div>
        <FormError message={error} />
        <Button type="submit" disabled={pending}>
          {pending ? "Creando cuenta…" : "Crear cuenta"}
        </Button>
      </form>
      <SocialButtons providers={providers} verb="Registrarte" disabled={pending} onSelect={onSocial} />
      <p className="text-small text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="text-foreground hover:text-brand underline underline-offset-2">
          Inicia sesión
        </Link>
      </p>
    </>
  );
}
