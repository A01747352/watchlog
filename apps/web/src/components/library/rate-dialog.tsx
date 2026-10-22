"use client";

import { defaultUserTags, type LibraryEntry, REVIEW_MAX_LENGTH } from "@watchlog/contracts";
import { Button } from "@watchlog/ui/components/button";
import { Chip } from "@watchlog/ui/components/chip";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@watchlog/ui/components/dialog";
import { Input } from "@watchlog/ui/components/input";
import { RatingInput } from "@watchlog/ui/components/rating-input";
import { Textarea } from "@watchlog/ui/components/textarea";
import { TypeBadge } from "@watchlog/ui/components/type-badge";
import { cn } from "@watchlog/ui/lib/utils";
import { CalendarDays, Plus } from "lucide-react";
import { type FormEvent, useEffect, useId, useState } from "react";

/** Enfoca el elemento al montarse (inputs que aparecen tras pulsar un botón). */
const focusOnMount = (element: HTMLInputElement | null) => element?.focus();

import { fetchUserTags, todayCalendarDate, updateEntry } from "@/lib/library-client";

import { FormError } from "../form-error";
import { Poster } from "../poster";

const mediaTypeToBadge = { MOVIE: "movie", SERIES: "series", ANIME: "anime" } as const;
/** El contador se vuelve rojo a partir de aquí (HANDOFF §5, Calificar). */
const REVIEW_WARNING_AT = 260;

function formatDay(date: string) {
  if (date === todayCalendarDate()) return "Visto hoy";
  const formatted = new Intl.DateTimeFormat("es", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
  return `Visto el ${formatted}`;
}

/**
 * Calificar (docs/design, pantalla 4): diálogo de 560px en escritorio y hoja inferior en móvil.
 * Nota con medios puntos, reseña corta (máx. 280), spoilers, etiquetas y fecha del visionado.
 */
export function RateDialog({
  entry,
  open,
  onOpenChange,
  onSaved,
}: {
  entry: LibraryEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (entry: LibraryEntry) => void;
}) {
  const ids = useId();
  const [rating, setRating] = useState<number | null>(entry.rating);
  const [review, setReview] = useState(entry.review ?? "");
  const [spoilers, setSpoilers] = useState(entry.reviewSpoilers);
  const [tags, setTags] = useState<string[]>(entry.userTags);
  const [suggested, setSuggested] = useState<string[]>([...defaultUserTags]);
  const [newTag, setNewTag] = useState<string | null>(null);
  const [watchedOn, setWatchedOn] = useState(entry.viewings[0]?.watchedOn ?? todayCalendarDate());
  const [editingDate, setEditingDate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Etiquetas propias del usuario, delante de las sugeridas.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void fetchUserTags().then((result) => {
      if (!cancelled && result.ok) setSuggested((current) => [...new Set([...result.data.tags, ...current])]);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const allTags = [...new Set([...tags, ...suggested])];
  const tracksViewing = entry.status === "COMPLETED";
  const rewatch = entry.viewings.length > 1;

  function toggleTag(tag: string) {
    setTags((current) => (current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]));
  }

  function addNewTag() {
    const tag = newTag?.trim();
    if (tag && !tags.includes(tag)) setTags((current) => [...current, tag]);
    setNewTag(null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await updateEntry(entry.id, {
      rating,
      review: review.trim() || null,
      reviewSpoilers: spoilers,
      userTags: tags,
      ...(tracksViewing && { watchedOn }),
    });
    setPending(false);
    if (!result.ok) return setError(result.error.message);
    onSaved?.(result.data.entry);
    onOpenChange(false);
  }

  const { title } = entry;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={`${ids}-meta`}>
        <form onSubmit={onSubmit} className="flex min-h-0 flex-col">
          <div className="flex min-h-0 flex-col gap-6 overflow-y-auto px-4 pt-4 pb-6 sm:px-6 sm:pt-6">
            <div className="flex items-center gap-4 pr-10">
              <Poster url={title.posterUrl} title={title.title} className="w-12 sm:w-13" />
              <div className="min-w-0">
                <DialogTitle className="font-display text-h2 line-clamp-2">{title.title}</DialogTitle>
                <DialogDescription id={`${ids}-meta`} className="flex flex-wrap items-center gap-x-1.5">
                  <TypeBadge type={mediaTypeToBadge[title.type]} />
                  {title.year && <span>· {title.year}</span>}
                  {rewatch && <span>· re-visionado</span>}
                </DialogDescription>
              </div>
            </div>

            <RatingInput value={rating} onChange={setRating} />

            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-2">
                <label htmlFor={`${ids}-review`} className="text-small font-semibold">
                  Reseña corta <span className="text-subtle-foreground font-normal">· opcional</span>
                </label>
                <span
                  id={`${ids}-count`}
                  className={cn(
                    "text-caption font-mono",
                    review.length >= REVIEW_WARNING_AT ? "text-destructive" : "text-subtle-foreground",
                  )}
                >
                  {review.length}/{REVIEW_MAX_LENGTH}
                </span>
              </div>
              <Textarea
                id={`${ids}-review`}
                rows={3}
                maxLength={REVIEW_MAX_LENGTH}
                value={review}
                onChange={(event) => setReview(event.target.value)}
                placeholder="¿Qué te quedó de ella?"
                aria-describedby={`${ids}-count`}
              />
              <label className="text-small text-muted-foreground flex w-fit items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={spoilers}
                  onChange={(event) => setSpoilers(event.target.checked)}
                  className="accent-primary size-4"
                />
                Contiene spoilers
              </label>
            </div>

            <fieldset className="flex flex-col gap-3">
              <legend className="text-small mb-3 font-semibold">Etiquetas</legend>
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
                {allTags.map((tag) => (
                  <Chip key={tag} pressed={tags.includes(tag)} onClick={() => toggleTag(tag)}>
                    {tag}
                  </Chip>
                ))}
                {newTag === null ? (
                  <button
                    type="button"
                    onClick={() => setNewTag("")}
                    className="border-input text-muted-foreground hover:text-foreground text-small inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-dashed px-3.5 font-medium"
                  >
                    <Plus aria-hidden="true" className="size-3.5" />
                    Nueva
                  </button>
                ) : (
                  <Input
                    ref={focusOnMount}
                    aria-label="Nueva etiqueta"
                    value={newTag}
                    maxLength={32}
                    onChange={(event) => setNewTag(event.target.value)}
                    onBlur={addNewTag}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addNewTag();
                      } else if (event.key === "Escape") {
                        event.stopPropagation();
                        setNewTag(null);
                      }
                    }}
                    className="h-9 w-40 shrink-0 rounded-full"
                  />
                )}
              </div>
            </fieldset>

            <FormError message={error} />
          </div>

          <div className="border-border flex flex-col gap-3 border-t px-4 pt-4 sm:flex-row sm:items-center sm:px-6 sm:py-4">
            {tracksViewing &&
              (editingDate ? (
                <Input
                  type="date"
                  aria-label="Fecha del visionado"
                  value={watchedOn}
                  max={todayCalendarDate()}
                  onChange={(event) => event.target.value && setWatchedOn(event.target.value)}
                  onBlur={() => setEditingDate(false)}
                  ref={focusOnMount}
                  className="h-9 w-auto"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingDate(true)}
                  className="text-small text-muted-foreground hover:text-foreground flex w-fit items-center gap-2 rounded-md"
                >
                  <CalendarDays aria-hidden="true" className="size-4" />
                  {formatDay(watchedOn)}
                  <span className="sr-only">(cambiar fecha)</span>
                </button>
              ))}
            <div className="flex gap-2 sm:ml-auto">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="hidden sm:inline-flex"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={pending} className="h-12 flex-1 sm:h-10 sm:flex-none">
                {pending ? "Guardando…" : "Guardar nota"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
