import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { authErrorMessage } from "@/lib/auth-client";
import { getAuthProviders, safeNextPath } from "@/lib/auth-providers";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const providers = await getAuthProviders();
  const error = typeof params.error === "string" ? authErrorMessage(params.error) : null;

  return (
    <AuthCard title="Hola de nuevo" description="Entra para seguir registrando lo que ves.">
      <LoginForm providers={providers} next={safeNextPath(params.next)} initialError={error} />
    </AuthCard>
  );
}
