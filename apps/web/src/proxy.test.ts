// @vitest-environment node
import { NextRequest } from "next/server";

import { proxy } from "./proxy";

const SESSION_COOKIE = "better-auth.session_token=abc.def";

function request(path: string, cookie?: string) {
  return new NextRequest(new URL(path, "http://localhost:3000"), {
    headers: cookie ? { cookie } : {},
  });
}

const location = (res: Response) => res.headers.get("location");

describe("proxy", () => {
  it("sin sesión, redirige la zona privada a /login conservando el destino", () => {
    expect(location(proxy(request("/title/movie/42?tab=cast")))).toBe(
      "http://localhost:3000/login?next=%2Ftitle%2Fmovie%2F42%3Ftab%3Dcast",
    );
  });

  it("sin sesión, la raíz va a /login sin ?next", () => {
    expect(location(proxy(request("/")))).toBe("http://localhost:3000/login");
  });

  it.each(["/login", "/signup", "/signup?code=abc", "/design"])("sin sesión, deja pasar %s", (path) => {
    expect(location(proxy(request(path)))).toBeNull();
  });

  it("con cookie de sesión, deja pasar la zona privada", () => {
    expect(location(proxy(request("/", SESSION_COOKIE)))).toBeNull();
  });

  it.each(["/login", "/signup"])("con sesión, %s redirige al inicio", (path) => {
    expect(location(proxy(request(path, SESSION_COOKIE)))).toBe("http://localhost:3000/");
  });
});
