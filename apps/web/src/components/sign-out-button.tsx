"use client";

import { Button } from "@watchlog/ui/components/button";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

export function SignOutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    await authClient.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <Button
      variant={compact ? "outline" : "ghost"}
      size={compact ? "touch" : "default"}
      onClick={signOut}
      disabled={pending}
      className={compact ? undefined : "w-full justify-start"}
    >
      <LogOut aria-hidden="true" />
      <span className={compact ? "sr-only" : undefined}>Salir</span>
    </Button>
  );
}
