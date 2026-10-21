import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { apiFetch } from "@/lib/api-client";
import type * as AuthClientModule from "@/lib/auth-client";
import { authClient } from "@/lib/auth-client";

import { SignupForm } from "./signup-form";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, refresh: vi.fn() }) }));
vi.mock("@/lib/api-client", () => ({ apiFetch: vi.fn() }));
vi.mock("@/lib/auth-client", async (importOriginal) => {
  const original = await importOriginal<typeof AuthClientModule>();
  return { ...original, authClient: { signUp: { email: vi.fn() }, signIn: { social: vi.fn() } } };
});

const providers = { emailPassword: true, github: true, google: false } as const;

async function fillAndSubmit() {
  await userEvent.type(screen.getByLabelText("Nombre"), "Ana");
  await userEvent.type(screen.getByLabelText("Email"), "ana@example.com");
  await userEvent.type(screen.getByLabelText("Contraseña"), "contraseña-segura");
  await userEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));
}

describe("SignupForm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rellena el código desde la URL", () => {
    render(<SignupForm providers={providers} initialCode="bienvenida" initialError={null} />);
    expect(screen.getByLabelText("Código de invitación")).toHaveValue("bienvenida");
  });

  it("si el código no sirve, no intenta crear la cuenta", async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      ok: false,
      status: 404,
      error: { code: "INVITE_USED", message: "Ese código de invitación ya se usó." },
    });
    render(<SignupForm providers={providers} initialCode="usado1" initialError={null} />);
    await fillAndSubmit();

    expect(await screen.findByRole("alert")).toHaveTextContent("ya se usó");
    expect(authClient.signUp.email).not.toHaveBeenCalled();
  });

  it("verifica la invitación y después crea la cuenta", async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      ok: true,
      data: { valid: true, expiresAt: "2026-12-01T00:00:00.000Z" },
    });
    vi.mocked(authClient.signUp.email).mockResolvedValue({ data: {}, error: null } as never);
    render(<SignupForm providers={providers} initialCode="bienvenida" initialError={null} />);
    await fillAndSubmit();

    expect(apiFetch).toHaveBeenCalledWith(
      "/api/invites/verify",
      expect.anything(),
      expect.objectContaining({ method: "POST", body: JSON.stringify({ code: "bienvenida" }) }),
    );
    expect(authClient.signUp.email).toHaveBeenCalledWith({
      name: "Ana",
      email: "ana@example.com",
      password: "contraseña-segura",
    });
    expect(replace).toHaveBeenCalledWith("/");
  });

  it("con GitHub también verifica primero la invitación", async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      ok: true,
      data: { valid: true, expiresAt: "2026-12-01T00:00:00.000Z" },
    });
    vi.mocked(authClient.signIn.social).mockResolvedValue({ data: {}, error: null } as never);
    render(<SignupForm providers={providers} initialCode="bienvenida" initialError={null} />);

    await userEvent.click(screen.getByRole("button", { name: "Registrarte con GitHub" }));
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(authClient.signIn.social).toHaveBeenCalledWith(expect.objectContaining({ provider: "github" }));
  });
});
