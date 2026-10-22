"use client";

import {
  type LibraryStatus,
  libraryStatusLabels,
  type SearchResponse,
  type SearchResult,
  type SearchTypeFilter,
} from "@watchlog/contracts";
import { Button } from "@watchlog/ui/components/button";
import { Kbd } from "@watchlog/ui/components/kbd";
import { StatusBadge } from "@watchlog/ui/components/status-badge";
import { TypeBadge, TypeShape } from "@watchlog/ui/components/type-badge";
import { cn } from "@watchlog/ui/lib/utils";
import { Check, CircleAlert, Clock, History, Search, X } from "lucide-react";
import { type KeyboardEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { addToLibrary, deleteEntry, searchTitles, todayCalendarDate } from "@/lib/library-client";
import { addRecentSearch, clearRecentSearches, useRecentSearches } from "@/lib/recent-searches";

import { useRateDialog } from "../library/rate-dialog-provider";
import { Poster } from "../poster";
import { useToast } from "../toast";

const DEBOUNCE_MS = 250;
const badgeType = { MOVIE: "movie", SERIES: "series", ANIME: "anime" } as const;

const tabs: Array<{ value: SearchTypeFilter; label: string; shape?: "movie" | "series" | "anime" }> = [
  { value: "all", label: "Todo" },
  { value: "movie", label: "Películas", shape: "movie" },
  { value: "series", label: "Series", shape: "series" },
  { value: "anime", label: "Anime", shape: "anime" },
];
const tabToType = { movie: "MOVIE", series: "SERIES", anime: "ANIME" } as const;

type State =
  | { kind: "idle" }
  | { kind: "loading"; previous: SearchResponse | null }
  | { kind: "done"; data: SearchResponse }
  | { kind: "error"; message: string };

const refOf = (r: Pick<SearchResult, "source" | "externalId">) => `${r.source}:${r.externalId}`;

/**
 * Búsqueda unificada con registro en un clic (docs/design, pantalla 3 "Buscar").
 * Objetivo: registrar algo en menos de 10 s — buscar → Visto → calificar opcional desde el toast.
 * Teclado: ↑↓ moverse · ↵ visto · Alt+P pendiente · Esc limpiar.
 */
export function SearchPanel({
  variant = "page",
  autoFocus = true,
}: {
  variant?: "page" | "dialog";
  autoFocus?: boolean;
}) {
  const ids = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const { openRating } = useRateDialog();
  /** Enter/Alt+P pulsado antes de que llegara la búsqueda: se aplica al primer resultado nuevo. */
  const queued = useRef<LibraryStatus | null>(null);
  const addRef = useRef<(result: SearchResult, status: LibraryStatus) => Promise<void>>(async () => {});
  const tabRef = useRef<SearchTypeFilter>("all");

  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<SearchTypeFilter>("all");
  const [state, setState] = useState<State>({ kind: "idle" });
  const [active, setActive] = useState(0);
  const recent = useRecentSearches();
  const [retry, setRetry] = useState(0);
  /** Estado local tras añadir/deshacer, por encima de lo que dijo la búsqueda. */
  const [overrides, setOverrides] = useState<Map<string, SearchResult["library"]>>(new Map());
  const [pendingRefs, setPendingRefs] = useState<Set<string>>(new Set());

  // Foco inicial con ref (no `autoFocus`): la búsqueda es el propósito de la pantalla y del ⌘K.
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  /** El estado de carga se fija al escribir (no en el efecto) para no renderizar en cascada. */
  function changeQuery(value: string) {
    queued.current = null;
    setQuery(value);
    setState((current) =>
      value.trim()
        ? {
            kind: "loading",
            previous:
              current.kind === "done" ? current.data : current.kind === "loading" ? current.previous : null,
          }
        : { kind: "idle" },
    );
  }

  // Búsqueda con debounce; cada tecla cancela la petición anterior.
  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const result = await searchTitles(q, { signal: controller.signal });
      if (controller.signal.aborted) return;
      if (!result.ok) {
        setState({ kind: "error", message: result.error.message });
        return;
      }
      setOverrides(new Map());
      setActive(0);
      setState({ kind: "done", data: result.data });

      const intent = queued.current;
      queued.current = null;
      if (intent) {
        const tabType = tabRef.current === "all" ? null : tabToType[tabRef.current];
        const first = result.data.results.find((r) => !tabType || r.type === tabType);
        if (first && !first.library) void addRef.current(first, intent);
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, retry]);

  const data = state.kind === "done" ? state.data : state.kind === "loading" ? state.previous : null;
  const all = useMemo(
    () =>
      (data?.results ?? []).map((r) => {
        const ref = refOf(r);
        return overrides.has(ref) ? { ...r, library: overrides.get(ref) ?? null } : r;
      }),
    [data, overrides],
  );
  const counts = useMemo(
    () => ({
      all: all.length,
      movie: all.filter((r) => r.type === "MOVIE").length,
      series: all.filter((r) => r.type === "SERIES").length,
      anime: all.filter((r) => r.type === "ANIME").length,
    }),
    [all],
  );
  const results = tab === "all" ? all : all.filter((r) => r.type === tabToType[tab]);
  const activeIndex = Math.min(active, Math.max(results.length - 1, 0));

  const add = useCallback(
    async (result: SearchResult, status: LibraryStatus) => {
      const ref = refOf(result);
      if (result.library || pendingRefs.has(ref)) return;
      setPendingRefs((current) => new Set(current).add(ref));

      const response = await addToLibrary({
        source: result.source,
        externalId: result.externalId,
        tmdbId: result.tmdbId,
        status,
        ...(status === "COMPLETED" && { watchedOn: todayCalendarDate() }),
      });
      setPendingRefs((current) => {
        const next = new Set(current);
        next.delete(ref);
        return next;
      });

      if (!response.ok) {
        toast.show({ title: "No se pudo añadir", description: response.error.message });
        return;
      }
      // Solo se recuerda la búsqueda que terminó en un registro (no cada tecla).
      addRecentSearch(query);
      const { entry } = response.data;
      setOverrides((current) => new Map(current).set(ref, { entryId: entry.id, status: entry.status }));
      toast.show({
        title: entry.title.title,
        description: `Añadido como ${libraryStatusLabels[entry.status]}`,
        posterUrl: entry.title.posterUrl,
        actions: [
          ...(entry.status === "COMPLETED"
            ? [{ label: "Calificar", variant: "brand" as const, onClick: () => openRating(entry) }]
            : []),
          ...(response.data.created
            ? [
                {
                  label: "Deshacer",
                  onClick: async () => {
                    const undone = await deleteEntry(entry.id);
                    if (undone.ok) setOverrides((current) => new Map(current).set(ref, null));
                    else toast.show({ title: "No se pudo deshacer", description: undone.error.message });
                  },
                },
              ]
            : []),
        ],
      });
    },
    [openRating, pendingRefs, query, toast],
  );

  useEffect(() => {
    addRef.current = add;
    tabRef.current = tab;
  }, [add, tab]);

  /** Mientras llega la búsqueda nueva, los resultados anteriores se ven pero no se pueden registrar. */
  const stale = state.kind === "loading";

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (results.length === 0) return;
      event.preventDefault();
      const delta = event.key === "ArrowDown" ? 1 : -1;
      setActive((activeIndex + delta + results.length) % results.length);
    } else if (event.key === "Enter" && !event.shiftKey) {
      if (stale) {
        event.preventDefault();
        queued.current = "COMPLETED";
        return;
      }
      const target = results[activeIndex];
      if (target) {
        event.preventDefault();
        void add(target, "COMPLETED");
      }
    } else if (event.altKey && event.code === "KeyP") {
      if (stale) {
        event.preventDefault();
        queued.current = "PLANNED";
        return;
      }
      const target = results[activeIndex];
      if (target) {
        event.preventDefault();
        void add(target, "PLANNED");
      }
    } else if (event.key === "Escape" && query && variant === "page") {
      event.preventDefault();
      changeQuery("");
    }
  }

  // Mantener visible la fila activa al moverse con el teclado.
  useEffect(() => {
    document.getElementById(`${ids}-option-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, ids]);

  const listId = `${ids}-results`;
  const showList = results.length > 0;
  const partialSource =
    data && (["tmdb", "anilist"] as const).find((source) => data.sources[source] === "error");

  return (
    <div className="flex flex-col gap-4">
      {/* Caja de búsqueda: 56px en la página, 40px en ⌘K (HANDOFF §4, SearchBar) */}
      <div
        className={cn(
          "border-input bg-background focus-within:border-ring focus-within:ring-ring/30 flex items-center gap-3 border px-4 transition-[border-color,box-shadow] focus-within:ring-3",
          variant === "page" ? "h-14 rounded-xl" : "h-12 rounded-lg",
        )}
      >
        <Search aria-hidden="true" className="text-muted-foreground size-5 shrink-0" />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-label="Buscar películas, series y anime"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList ? `${ids}-option-${activeIndex}` : undefined}
          placeholder="Película, serie o anime…"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(event) => changeQuery(event.target.value)}
          onKeyDown={onKeyDown}
          className="text-body placeholder:text-subtle-foreground h-full min-w-0 flex-1 bg-transparent outline-none sm:text-h3 sm:font-normal [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              changeQuery("");
              inputRef.current?.focus();
            }}
            className="bg-secondary text-muted-foreground hover:text-foreground flex size-8 shrink-0 items-center justify-center rounded-md"
          >
            <X aria-hidden="true" className="size-4" />
            <span className="sr-only">Borrar búsqueda</span>
          </button>
        )}
      </div>

      {/* Pestañas por tipo con conteos (HANDOFF §5: role="tablist") */}
      {data && (
        <div
          role="tablist"
          aria-label="Filtrar por tipo"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0"
        >
          {tabs.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={tab === t.value}
              aria-controls={listId}
              onClick={() => {
                setTab(t.value);
                setActive(0);
              }}
              className={cn(
                "text-small inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 font-emphasis transition-colors",
                tab === t.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {t.shape && <TypeShape type={t.shape} />}
              {t.label}
              <span
                className={cn(
                  "font-mono text-caption",
                  tab === t.value ? "opacity-70" : "text-subtle-foreground",
                )}
              >
                {counts[t.value]}
              </span>
            </button>
          ))}
        </div>
      )}

      {partialSource && (
        <p className="text-small text-muted-foreground flex items-center gap-2">
          <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
          {partialSource === "anilist"
            ? "AniList no responde ahora: puede faltar anime en los resultados."
            : "TMDB no responde ahora: pueden faltar películas y series."}
        </p>
      )}

      {/* Resultados */}
      {state.kind === "loading" && !state.previous ? (
        <ResultsSkeleton />
      ) : state.kind === "error" ? (
        <div
          role="alert"
          className="border-border flex flex-col items-center gap-3 rounded-xl border px-6 py-10 text-center"
        >
          <CircleAlert aria-hidden="true" className="text-destructive size-6" />
          <p className="text-body">{state.message}</p>
          <Button
            variant="secondary"
            onClick={() => {
              changeQuery(query);
              setRetry((n) => n + 1);
            }}
          >
            Reintentar
          </Button>
        </div>
      ) : data && results.length === 0 ? (
        <div className="flex flex-col items-center gap-1 px-6 py-10 text-center">
          <p className="font-display text-h2">Sin resultados para “{data.query}”</p>
          <p className="text-muted-foreground">Prueba con el título original o en inglés.</p>
        </div>
      ) : showList ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Resultados"
          aria-busy={state.kind === "loading"}
          className={cn(
            "border-border divide-border overflow-hidden rounded-xl border divide-y",
            variant === "page" && "bg-card",
            state.kind === "loading" && "opacity-60",
          )}
        >
          {results.map((result, index) => (
            <ResultRow
              key={refOf(result)}
              id={`${ids}-option-${index}`}
              result={result}
              active={index === activeIndex}
              pending={stale || pendingRefs.has(refOf(result))}
              onHover={() => setActive(index)}
              onAdd={(status) => void add(result, status)}
            />
          ))}
        </ul>
      ) : state.kind === "idle" && recent.length > 0 ? (
        <section aria-labelledby={`${ids}-recent`} className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 id={`${ids}-recent`} className="text-small text-muted-foreground font-semibold">
              Búsquedas recientes
            </h2>
            <button
              type="button"
              onClick={clearRecentSearches}
              className="text-caption text-subtle-foreground hover:text-foreground font-normal"
            >
              Borrar
            </button>
          </div>
          <ul className="flex flex-col">
            {recent.map((term) => (
              <li key={term}>
                <button
                  type="button"
                  onClick={() => {
                    changeQuery(term);
                    inputRef.current?.focus();
                  }}
                  className="text-body hover:bg-accent flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left"
                >
                  <History aria-hidden="true" className="text-subtle-foreground size-4" />
                  {term}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {showList && (
        <p className="text-caption text-subtle-foreground hidden flex-wrap items-center gap-x-4 gap-y-2 font-normal sm:flex">
          <span className="flex items-center gap-1.5">
            <Kbd>↑↓</Kbd> moverse
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>↵</Kbd> marcar visto
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>Alt</Kbd>
            <Kbd>P</Kbd> pendiente
          </span>
        </p>
      )}
    </div>
  );
}

function ResultRow({
  id,
  result,
  active,
  pending,
  onHover,
  onAdd,
}: {
  id: string;
  result: SearchResult;
  active: boolean;
  pending: boolean;
  onHover: () => void;
  onAdd: (status: LibraryStatus) => void;
}) {
  return (
    <li
      id={id}
      role="option"
      aria-selected={active}
      onMouseMove={onHover}
      className={cn("flex items-center gap-3 px-3 py-3 sm:gap-4", active && "bg-accent")}
    >
      <Poster url={result.posterUrl} title={result.title} className="w-10 sm:w-11" sizes="48px" />
      <div className="min-w-0 flex-1">
        <p className="text-body truncate font-semibold">{result.title}</p>
        <p className="text-small text-muted-foreground flex items-center gap-1.5 truncate">
          <TypeBadge type={badgeType[result.type]} />
          {result.year && <span className="font-mono text-caption font-normal">· {result.year}</span>}
          {result.originalTitle && (
            <span className="hidden truncate md:inline">· {result.originalTitle}</span>
          )}
        </p>
      </div>
      {result.library ? (
        <StatusBadge status={result.library.status} className="text-small" />
      ) : (
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={() => onAdd("PLANNED")}
            className="hidden sm:inline-flex"
            aria-label={`Añadir ${result.title} a pendientes`}
          >
            <Clock aria-hidden="true" className="size-3.5" />
            Pendiente
          </Button>
          <Button
            size="sm"
            disabled={pending}
            onClick={() => onAdd("COMPLETED")}
            className="hidden sm:inline-flex"
            aria-label={`Marcar ${result.title} como visto`}
          >
            <Check aria-hidden="true" className="size-3.5" />
            Visto
          </Button>
          {/* Móvil: un solo objetivo táctil de 44px */}
          <Button
            variant="outline"
            size="touch"
            disabled={pending}
            onClick={() => onAdd("COMPLETED")}
            className="sm:hidden"
            aria-label={`Marcar ${result.title} como visto`}
          >
            <Check aria-hidden="true" />
          </Button>
        </div>
      )}
    </li>
  );
}

function ResultsSkeleton() {
  return (
    <ul aria-hidden="true" className="border-border divide-border divide-y overflow-hidden rounded-xl border">
      {Array.from({ length: 5 }, (_, index) => (
        <li key={index} className="flex items-center gap-4 px-3 py-3">
          <div className="bg-muted animate-skeleton aspect-poster w-10 rounded-md sm:w-11" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="bg-muted animate-skeleton h-4 w-1/2 rounded-sm" />
            <div className="bg-muted animate-skeleton h-3 w-1/4 rounded-sm" />
          </div>
        </li>
      ))}
    </ul>
  );
}
