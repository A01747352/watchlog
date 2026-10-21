import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

/** Rutas accesibles sin sesión. */
const publicPaths = ["/login", "/signup", "/design"];
/** Rutas que no tienen sentido con sesión iniciada. */
const guestOnlyPaths = ["/login", "/signup"];

const matches = (pathname: string, paths: string[]) =>
  paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));

/**
 * Proxy de Next.js 16 (antes middleware.ts). Comprobación optimista por cookie:
 * sin cookie de sesión, las rutas de (app) redirigen a /login. La validación real
 * de la sesión la hace el layout de (app) contra la API.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = Boolean(getSessionCookie(request));

  if (!hasSession && !matches(pathname, publicPaths)) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }
  if (hasSession && matches(pathname, guestOnlyPaths)) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Ni la API (reenviada a apps/api) ni los estáticos pasan por aquí.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
};
