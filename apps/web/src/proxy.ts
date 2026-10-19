import { NextResponse } from "next/server";

/**
 * Proxy de Next.js 16 (antes middleware.ts).
 * Fase 1: no hace nada. En la Fase 2 redirigirá a /login si no hay sesión en las rutas de (app).
 */
export function proxy() {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
