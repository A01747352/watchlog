import type { LibraryEntry, SearchResponse, SearchResult } from "@watchlog/contracts";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { ApiResult } from "@/lib/api-client";
import type * as LibraryClient from "@/lib/library-client";
import { addToLibrary, deleteEntry, searchTitles } from "@/lib/library-client";

import { RateDialogProvider } from "../library/rate-dialog-provider";
import { ToastProvider } from "../toast";
import { SearchPanel } from "./search-panel";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- simulación de next/image
  default: ({ unoptimized: _u, fill: _f, ...props }: Record<string, unknown>) => <img {...props} />,
}));
vi.mock("@/lib/library-client", async (importOriginal) => ({
  ...(await importOriginal<typeof LibraryClient>()),
  searchTitles: vi.fn(),
  addToLibrary: vi.fn(),
  deleteEntry: vi.fn(),
  fetchUserTags: vi.fn(async () => ({ ok: true, data: { tags: [] } })),
}));

function result(overrides: Partial<SearchResult>): SearchResult {
  return {
    source: "TMDB",
    externalId: "movie:1",
    tmdbId: 1,
    type: "MOVIE",
    title: "Título",
    originalTitle: null,
    year: 2020,
    posterUrl: null,
    overview: null,
    library: null,
    ...overrides,
  };
}

function response(query: string, results: SearchResult[]): ApiResult<SearchResponse> {
  return { ok: true, data: { query, type: "all", results, sources: { tmdb: "ok", anilist: "ok" } } };
}

function entry(title: string, status: LibraryEntry["status"]): LibraryEntry {
  return {
    id: `entry-${title}`,
    status,
    rating: null,
    review: null,
    reviewSpoilers: false,
    favorite: false,
    userTags: [],
    currentSeason: null,
    currentEpisode: null,
    startedAt: null,
    finishedAt: null,
    createdAt: "2026-10-22T10:00:00.000Z",
    updatedAt: "2026-10-22T10:00:00.000Z",
    title: {
      id: "t1",
      source: "TMDB",
      externalId: "movie:1",
      type: "MOVIE",
      title,
      year: 2021,
      posterUrl: null,
      episodes: null,
      seasons: null,
    },
    viewings: [],
  };
}

const frieren = result({
  source: "ANILIST",
  externalId: "154587",
  tmdbId: 209867,
  type: "ANIME",
  title: "Frieren",
});
const brennan = result({ externalId: "movie:9", title: "Fr. Brennan" });

function renderPanel() {
  return render(
    <ToastProvider>
      <RateDialogProvider>
        <SearchPanel />
      </RateDialogProvider>
    </ToastProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("SearchPanel", () => {
  it("Enter antes de que llegue la búsqueda registra el primer resultado nuevo, no el anterior", async () => {
    vi.mocked(searchTitles).mockImplementation(async (q) => response(q, q === "fr" ? [brennan] : [frieren]));
    vi.mocked(addToLibrary).mockResolvedValue({
      ok: true,
      data: { created: true, entry: entry("Frieren", "COMPLETED") },
    });
    renderPanel();

    const input = screen.getByRole("combobox");
    await userEvent.type(input, "fr");
    expect(await screen.findByRole("option", { name: /Fr\. Brennan/ })).toBeInTheDocument();

    await userEvent.type(input, "ieren{Enter}");

    await waitFor(() => expect(addToLibrary).toHaveBeenCalledTimes(1));
    expect(addToLibrary).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "ANILIST",
        externalId: "154587",
        tmdbId: 209867,
        status: "COMPLETED",
        watchedOn: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent("Añadido como Terminado");
  });

  it("mientras carga, los resultados anteriores no se pueden registrar", async () => {
    let release: () => void = () => {};
    vi.mocked(searchTitles).mockImplementation(async (q) =>
      q === "fr"
        ? response(q, [brennan])
        : new Promise((resolve) => (release = () => resolve(response(q, [frieren])))),
    );
    renderPanel();

    const input = screen.getByRole("combobox");
    await userEvent.type(input, "fr");
    await screen.findByRole("option", { name: /Fr\. Brennan/ });
    await userEvent.type(input, "i");

    const stale = screen.getByRole("option", { name: /Fr\. Brennan/ });
    // Botón de escritorio y de móvil (jsdom no aplica el CSS que oculta uno): ambos desactivados.
    for (const button of within(stale).getAllByRole("button")) expect(button).toBeDisabled();

    await waitFor(() => expect(searchTitles).toHaveBeenCalledWith("fri", expect.anything()));
    release();
    expect(await screen.findByRole("option", { name: /Frieren/ })).toBeInTheDocument();
  });

  it("Deshacer borra la entrada y devuelve los botones", async () => {
    vi.mocked(searchTitles).mockResolvedValue(response("dune", [result({ title: "Dune" })]));
    vi.mocked(addToLibrary).mockResolvedValue({
      ok: true,
      data: { created: true, entry: entry("Dune", "PLANNED") },
    });
    vi.mocked(deleteEntry).mockResolvedValue({ ok: true, data: undefined });
    renderPanel();

    await userEvent.type(screen.getByRole("combobox"), "dune");
    await userEvent.click(await screen.findByRole("button", { name: "Añadir Dune a pendientes" }));

    const toast = await screen.findByRole("status");
    expect(toast).toHaveTextContent("Añadido como Pendiente");
    expect(within(toast).queryByRole("button", { name: "Calificar" })).toBeNull();
    expect(screen.getByRole("option", { name: /Dune/ })).toHaveTextContent("Pendiente");

    await userEvent.click(within(toast).getByRole("button", { name: "Deshacer" }));
    expect(deleteEntry).toHaveBeenCalledWith("entry-Dune");
    expect(await screen.findByRole("button", { name: "Añadir Dune a pendientes" })).toBeEnabled();
  });

  it("muestra el error con Reintentar y vuelve a buscar", async () => {
    vi.mocked(searchTitles)
      .mockResolvedValueOnce({
        ok: false,
        status: 502,
        error: { code: "SEARCH_UNAVAILABLE", message: "La búsqueda no está disponible ahora." },
      })
      .mockResolvedValueOnce(response("dune", [result({ title: "Dune" })]));
    renderPanel();

    await userEvent.type(screen.getByRole("combobox"), "dune");
    expect(await screen.findByRole("alert")).toHaveTextContent("La búsqueda no está disponible ahora.");
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("option", { name: /Dune/ })).toBeInTheDocument();
  });

  it("cuenta resultados por tipo y filtra con las pestañas", async () => {
    vi.mocked(searchTitles).mockResolvedValue(
      response("x", [
        result({ title: "Una película" }),
        frieren,
        result({ externalId: "tv:2", type: "SERIES", title: "Una serie" }),
      ]),
    );
    renderPanel();

    await userEvent.type(screen.getByRole("combobox"), "x");
    expect(await screen.findByRole("tab", { name: /Todo\s*3/ })).toHaveAttribute("aria-selected", "true");
    await userEvent.click(screen.getByRole("tab", { name: /Anime\s*1/ }));
    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(screen.getByRole("option")).toHaveTextContent("Frieren");
  });

  it("recuerda la búsqueda solo cuando termina en un registro", async () => {
    vi.mocked(searchTitles).mockImplementation(async (q) => response(q, [result({ title: "Dune" })]));
    vi.mocked(addToLibrary).mockResolvedValue({
      ok: true,
      data: { created: true, entry: entry("Dune", "COMPLETED") },
    });
    renderPanel();

    const input = screen.getByRole("combobox");
    await userEvent.type(input, "dune{Enter}");
    await screen.findByRole("status");
    await userEvent.clear(input);

    expect(await screen.findByRole("heading", { name: "Búsquedas recientes" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "dune" })).toHaveLength(1);
  });
});
