import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/auth-card";
import { SignupForm } from "@/components/auth/signup-form";
import { authErrorMessage } from "@/lib/auth-client";
import { getAuthProviders } from "@/lib/auth-providers";

export const metadata: Metadata = { title: "Crear cuenta" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const providers = await getAuthProviders();
  const code = typeof params.code === "string" ? params.code : "";
  const error = typeof params.error === "string" ? authErrorMessage(params.error) : null;

  return (
    <AuthCard
      title="Crea tu cuenta"
      description="Watchlog es solo por invitación. Usa el código que te pasaron."
    >
      <SignupForm providers={providers} initialCode={code} initialError={error} />
    </AuthCard>
  );
}
