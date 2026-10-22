import { z } from "zod";

import { type LibraryStatus, libraryStatusSchema, mediaTypeSchema, sourceSchema } from "./enums";

/** Etiquetas en español de docs/design (HANDOFF §4, StatusBadge). */
export const libraryStatusLabels: Record<LibraryStatus, string> = {
  PLANNED: "Pendiente",
  WATCHING: "Viendo",
  COMPLETED: "Terminado",
  ON_HOLD: "En pausa",
  DROPPED: "Abandonado",
};

/** Nota de 1 a 10 en pasos de 0.5. */
export const ratingSchema = z
  .number()
  .min(1, "La nota mínima es 1")
  .max(10, "La nota máxima es 10")
  .refine((value) => Number.isInteger(value * 2), "La nota va en pasos de 0.5");

export const REVIEW_MAX_LENGTH = 280;

export const userTagSchema = z.string().trim().min(1).max(32, "Etiqueta demasiado larga");

/** Fecha de calendario `YYYY-MM-DD` (sin hora: "visto el 21 de octubre"). */
export const calendarDateSchema = z.iso.date();

export const viewingSchema = z.object({
  id: z.string(),
  watchedOn: calendarDateSchema,
  note: z.string().nullable(),
});
export type Viewing = z.infer<typeof viewingSchema>;

export const libraryTitleSchema = z.object({
  id: z.string(),
  source: sourceSchema,
  externalId: z.string(),
  type: mediaTypeSchema,
  title: z.string(),
  year: z.number().int().nullable(),
  posterUrl: z.url().nullable(),
  episodes: z.number().int().nullable(),
  seasons: z.number().int().nullable(),
});
export type LibraryTitle = z.infer<typeof libraryTitleSchema>;

export const libraryEntrySchema = z.object({
  id: z.string(),
  status: libraryStatusSchema,
  rating: z.number().nullable(),
  review: z.string().nullable(),
  reviewSpoilers: z.boolean(),
  favorite: z.boolean(),
  userTags: z.array(z.string()),
  currentSeason: z.number().int().nullable(),
  currentEpisode: z.number().int().nullable(),
  startedAt: z.iso.datetime().nullable(),
  finishedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  title: libraryTitleSchema,
  viewings: z.array(viewingSchema),
});
export type LibraryEntry = z.infer<typeof libraryEntrySchema>;

/**
 * `POST /api/library`: añade un resultado de búsqueda a la biblioteca en un paso.
 * La API guarda el título en su caché (`Title`) la primera vez. Con `COMPLETED`
 * registra además un visionado (hoy, o `watchedOn`).
 */
export const addToLibraryRequestSchema = z.object({
  source: sourceSchema,
  externalId: z.string().min(1).max(64),
  /** Referencia cruzada a TMDB que trae la búsqueda para anime de AniList. */
  tmdbId: z.number().int().positive().nullable().optional(),
  status: libraryStatusSchema,
  watchedOn: calendarDateSchema.optional(),
});
export type AddToLibraryRequest = z.infer<typeof addToLibraryRequestSchema>;

/** 201 si se creó, 200 si ya estaba (y se devolvió tal cual). */
export const addToLibraryResponseSchema = z.object({
  created: z.boolean(),
  entry: libraryEntrySchema,
});
export type AddToLibraryResponse = z.infer<typeof addToLibraryResponseSchema>;

/**
 * `PATCH /api/library/:id`: edición parcial (estado, nota, reseña, etiquetas, progreso).
 * `null` borra el valor. `watchedOn` fecha el visionado más reciente (o crea uno).
 */
export const updateLibraryEntryRequestSchema = z
  .object({
    status: libraryStatusSchema,
    rating: ratingSchema.nullable(),
    review: z.string().trim().max(REVIEW_MAX_LENGTH, `Máximo ${REVIEW_MAX_LENGTH} caracteres`).nullable(),
    reviewSpoilers: z.boolean(),
    favorite: z.boolean(),
    userTags: z.array(userTagSchema).max(20, "Máximo 20 etiquetas"),
    currentSeason: z.number().int().min(1).nullable(),
    currentEpisode: z.number().int().min(0).nullable(),
    watchedOn: calendarDateSchema,
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, "No hay nada que actualizar");
export type UpdateLibraryEntryRequest = z.infer<typeof updateLibraryEntryRequestSchema>;

export const libraryEntryResponseSchema = z.object({ entry: libraryEntrySchema });
export type LibraryEntryResponse = z.infer<typeof libraryEntryResponseSchema>;

/** `POST /api/library/:id/viewings`: registra un re-visionado. */
export const addViewingRequestSchema = z.object({
  watchedOn: calendarDateSchema,
  note: z.string().trim().max(REVIEW_MAX_LENGTH).optional(),
});
export type AddViewingRequest = z.infer<typeof addViewingRequestSchema>;

/** `GET /api/library/tags`: etiquetas propias del usuario, de más a menos usadas. */
export const libraryTagsResponseSchema = z.object({ tags: z.array(z.string()) });
export type LibraryTagsResponse = z.infer<typeof libraryTagsResponseSchema>;

/** Etiquetas sugeridas por defecto (docs/design, pantalla Calificar). */
export const defaultUserTags = [
  "Para re-ver",
  "Banda sonora",
  "Lloré",
  "Final perfecto",
  "Visualmente brutal",
  "Lenta",
  "Sobrevalorada",
  "Con amigos",
] as const;

/** Palabra de cada nota (HANDOFF §4, RatingInput): índice = parte entera de la nota. */
export const ratingWords = [
  "",
  "Terrible",
  "Muy mala",
  "Mala",
  "Floja",
  "Regular",
  "Correcta",
  "Buena",
  "Muy buena",
  "Excelente",
  "Obra maestra",
] as const;

export function ratingWord(rating: number) {
  return ratingWords[Math.min(10, Math.max(1, Math.floor(rating)))] ?? "";
}
