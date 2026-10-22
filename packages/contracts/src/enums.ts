import { z } from "zod";

/** Tipos de contenido (mismos valores que el enum `MediaType` de la base de datos). */
export const mediaTypeSchema = z.enum(["MOVIE", "SERIES", "ANIME"]);
export type MediaType = z.infer<typeof mediaTypeSchema>;

export const sourceSchema = z.enum(["TMDB", "ANILIST"]);
export type Source = z.infer<typeof sourceSchema>;

/** Estados de una entrada (mismos valores que el enum `Status` de la base de datos). */
export const libraryStatusSchema = z.enum(["PLANNED", "WATCHING", "COMPLETED", "ON_HOLD", "DROPPED"]);
export type LibraryStatus = z.infer<typeof libraryStatusSchema>;
