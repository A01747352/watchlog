"use client";

import type { AuthProvidersResponse } from "@watchlog/contracts";
import { Button } from "@watchlog/ui/components/button";
import { Input } from "@watchlog/ui/components/input";
import { Label } from "@watchlog/ui/components/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { authClient, authErrorMessage } from "@/lib/auth-client";

import { FormError } from "../form-error";
import { type SocialProvider, SocialButtons } from "./social-buttons";

export function LoginForm({
  providers,
  next,
  initialError,
}: {
  providers: AuthProvidersResponse;
  next: string;
  initialError: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState(initialError);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);

    const { error } = await authClient.signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    if (error) {
      setError(authErrorMessage(error.code, error.message));
      setPending(false);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  async function onSocial(provider: SocialProvider) {
    setPending(true);
    setError(null);
    const { error } = await authClient.signIn.social({
      provider,
      callbackURL: next,
      errorCallbackURL: "/login",
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
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        <FormError message={error} />
        <Button type="submit" disabled={pending}>
          {pending ? "Entrando…" : "Entrar"}
        </Button>
      </form>
      <SocialButtons providers={providers} verb="Entrar" disabled={pending} onSelect={onSocial} />
      <p className="text-small text-muted-foreground">
        ¿Tienes una invitación?{" "}
        <Link href="/signup" className="text-foreground hover:text-brand underline underline-offset-2">
          Crea tu cuenta
        </Link>
      </p>
    </>
  );
}
