import type { LibraryEntry } from "@watchlog/contracts";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type * as LibraryClient from "@/lib/library-client";
import { updateEntry } from "@/lib/library-client";

import { RateDialog } from "./rate-dialog";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- simulación de next/image
  default: ({ unoptimized: _u, fill: _f, ...props }: Record<string, unknown>) => <img {...props} />,
}));
vi.mock("@/lib/library-client", async (importOriginal) => ({
  ...(await importOriginal<typeof LibraryClient>()),
  updateEntry: vi.fn(),
  fetchUserTags: vi.fn(async () => ({ ok: true, data: { tags: ["Mis favoritas"] } })),
}));

const entry: LibraryEntry = {
  id: "e1",
  status: "COMPLETED",
  rating: null,
  review: null,
  reviewSpoilers: false,
  favorite: false,
  userTags: [],
  currentSeason: null,
  currentEpisode: null,
  startedAt: null,
  finishedAt: "2026-10-01T00:00:00.000Z",
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
  title: {
    id: "t1",
    source: "ANILIST",
    externalId: "154587",
    type: "ANIME",
    title: "Frieren: Beyond Journey’s End",
    year: 2023,
    posterUrl: null,
    episodes: 28,
    seasons: null,
  },
  viewings: [
    { id: "v2", watchedOn: "2026-10-01", note: null },
    { id: "v1", watchedOn: "2024-03-01", note: null },
  ],
};

describe("RateDialog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("muestra título, tipo, año y que es un re-visionado", async () => {
    render(<RateDialog entry={entry} open onOpenChange={() => {}} />);
    const dialog = screen.getByRole("dialog", { name: "Frieren: Beyond Journey’s End" });
    expect(dialog).toHaveTextContent("Anime");
    expect(dialog).toHaveTextContent("2023");
    expect(dialog).toHaveTextContent("re-visionado");
    // Etiquetas propias del usuario delante de las sugeridas
    expect(await screen.findByRole("button", { name: "Mis favoritas" })).toBeInTheDocument();
  });

  it("guarda nota, reseña, spoilers, etiquetas y fecha del último visionado", async () => {
    const onSaved = vi.fn();
    const onOpenChange = vi.fn();
    vi.mocked(updateEntry).mockResolvedValue({ ok: true, data: { entry: { ...entry, rating: 9.5 } } });
    render(<RateDialog entry={entry} open onOpenChange={onOpenChange} onSaved={onSaved} />);

    screen.getByRole("slider").focus();
    await userEvent.keyboard("9{ArrowRight}");
    await userEvent.type(screen.getByLabelText(/Reseña corta/), "  Preciosa.  ");
    await userEvent.click(screen.getByLabelText("Contiene spoilers"));
    await userEvent.click(screen.getByRole("button", { name: "Lloré" }));
    await userEvent.click(screen.getByRole("button", { name: "Nueva" }));
    await userEvent.type(screen.getByLabelText("Nueva etiqueta"), "Comfort{Enter}");
    await userEvent.click(screen.getByRole("button", { name: "Guardar nota" }));

    await waitFor(() =>
      expect(updateEntry).toHaveBeenCalledWith("e1", {
        rating: 9.5,
        review: "Preciosa.",
        reviewSpoilers: true,
        userTags: ["Lloré", "Comfort"],
        watchedOn: "2026-10-01",
      }),
    );
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ rating: 9.5 }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("el contador de la reseña se vuelve rojo a partir de 260 caracteres", async () => {
    render(<RateDialog entry={entry} open onOpenChange={() => {}} />);
    const counter = screen.getByText("0/280");
    expect(counter).toHaveClass("text-subtle-foreground");
    await userEvent.click(screen.getByLabelText(/Reseña corta/));
    await userEvent.paste("x".repeat(260));
    expect(screen.getByText("260/280")).toHaveClass("text-destructive");
  });

  it("si la API falla, muestra el error y no se cierra", async () => {
    const onOpenChange = vi.fn();
    vi.mocked(updateEntry).mockResolvedValue({
      ok: false,
      status: 400,
      error: { code: "INVALID_REQUEST", message: "La nota va en pasos de 0.5" },
    });
    render(<RateDialog entry={entry} open onOpenChange={onOpenChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Guardar nota" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("La nota va en pasos de 0.5");
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
