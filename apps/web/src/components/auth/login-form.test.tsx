import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type * as AuthClientModule from "@/lib/auth-client";
import { authClient } from "@/lib/auth-client";

import { LoginForm } from "./login-form";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, refresh: vi.fn() }) }));
vi.mock("@/lib/auth-client", async (importOriginal) => {
  const original = await importOriginal<typeof AuthClientModule>();
  return {
    ...original,
    authClient: { signIn: { email: vi.fn(), social: vi.fn() } },
  };
});

const emailOnly = { emailPassword: true, github: false, google: false } as const;

describe("LoginForm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("solo muestra los proveedores OAuth configurados", () => {
    const { rerender } = render(<LoginForm providers={emailOnly} next="/" initialError={null} />);
    expect(screen.queryByRole("button", { name: /GitHub/ })).toBeNull();

    rerender(<LoginForm providers={{ ...emailOnly, github: true }} next="/" initialError={null} />);
    expect(screen.getByRole("button", { name: "Entrar con GitHub" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Google/ })).toBeNull();
  });

  it("muestra el error traducido si las credenciales fallan", async () => {
    vi.mocked(authClient.signIn.email).mockResolvedValue({
      data: null,
      error: {
        code: "INVALID_EMAIL_OR_PASSWORD",
        message: "Invalid email or password",
        status: 401,
        statusText: "",
      },
    } as never);
    render(<LoginForm providers={emailOnly} next="/" initialError={null} />);

    await userEvent.type(screen.getByLabelText("Email"), "ana@example.com");
    await userEvent.type(screen.getByLabelText("Contraseña"), "incorrecta");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Email o contraseña incorrectos.");
    expect(replace).not.toHaveBeenCalled();
  });

  it("al entrar redirige al destino pedido", async () => {
    vi.mocked(authClient.signIn.email).mockResolvedValue({ data: {}, error: null } as never);
    render(<LoginForm providers={emailOnly} next="/title/movie/42" initialError={null} />);

    await userEvent.type(screen.getByLabelText("Email"), "ana@example.com");
    await userEvent.type(screen.getByLabelText("Contraseña"), "contraseña-segura");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(replace).toHaveBeenCalledWith("/title/movie/42");
  });
});
