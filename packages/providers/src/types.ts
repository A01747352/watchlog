/** Tipos normalizados que comparten todos los proveedores (mismos valores que los enums de Prisma). */
export type MediaType = "MOVIE" | "SERIES" | "ANIME";
export type Source = "TMDB" | "ANILIST";

/** Resultado de búsqueda o recomendación, ya normalizado. */
export type ProviderSearchItem = {
  source: Source;
  /** Id en el proveedor. En TMDB lleva el tipo delante (`movie:438631`, `tv:95396`) porque los ids se repiten. */
  externalId: string;
  /** Referencia cruzada a TMDB (para anime de AniList que también está en TMDB). */
  tmdbId: number | null;
  type: MediaType;
  title: string;
  originalTitle: string | null;
  /** Todos los títulos conocidos (localizado, original, romaji, inglés, nativo), para buscar y deduplicar. */
  altTitles: string[];
  year: number | null;
  posterUrl: string | null;
  overview: string | null;
  /** Popularidad normalizada a 0–1, comparable entre proveedores (ver `popularity.ts`). */
  popularity: number;
  /**
   * TMDB: parece anime (animación japonesa). La búsqueda unificada lo sustituye por la
   * versión de AniList si la encuentra.
   */
  animeCandidate: boolean;
};

/** Ficha completa: los campos del modelo `Title` de packages/db. */
export type ProviderTitle = {
  source: Source;
  externalId: string;
  tmdbId: number | null;
  type: MediaType;
  title: string;
  originalTitle: string | null;
  year: number | null;
  /** Ruta de TMDB (`/abc.jpg`) o URL completa de AniList. */
  posterPath: string | null;
  backdropPath: string | null;
  overview: string | null;
  genres: string[];
  /** Keywords de TMDB o tags de AniList (sin spoilers). */
  tags: string[];
  /** Director, creadores o estudio. */
  people: string[];
  /** Duración de la película o de cada episodio. */
  runtimeMin: number | null;
  episodes: number | null;
  seasons: number | null;
  /** Respuesta original del proveedor, para no volver a pedirla. */
  raw: unknown;
};

export type SearchOptions = {
  /** Si se indica, el proveedor solo devuelve ese tipo. */
  type?: MediaType | undefined;
  limit?: number | undefined;
  signal?: AbortSignal | undefined;
};

/** Interfaz común de las fuentes de datos (docs/SPEC.md, "Capa de proveedores"). */
export interface MediaProvider {
  readonly source: Source;
  search(query: string, options?: SearchOptions): Promise<ProviderSearchItem[]>;
  /** `null` si el título no existe en el proveedor. */
  getDetails(externalId: string, options?: { signal?: AbortSignal }): Promise<ProviderTitle | null>;
  getRecommendations(
    externalId: string,
    options?: { limit?: number; signal?: AbortSignal },
  ): Promise<ProviderSearchItem[]>;
}
