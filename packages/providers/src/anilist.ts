import { z } from "zod";

import { createHttpClient, type HttpClientOptions, ProviderError } from "./http";
import { anilistPopularity } from "./popularity";
import { stripHtml, unique } from "./text";
import type { MediaProvider, ProviderSearchItem, ProviderTitle, SearchOptions } from "./types";

export const ANILIST_API_URL = "https://graphql.anilist.co";

// ── GraphQL ──────────────────────────────────────────────────────────────────

const MEDIA_FIELDS = `
  id
  title { romaji english native }
  format
  episodes
  duration
  seasonYear
  startDate { year }
  coverImage { large extraLarge }
  bannerImage
  description(asHtml: false)
  genres
  isAdult
  popularity
  tags { name rank isMediaSpoiler isAdult }
  studios(isMain: true) { nodes { name } }
`;

const SEARCH_QUERY = `
  query Search($search: String!, $perPage: Int!) {
    Page(perPage: $perPage) {
      media(search: $search, type: ANIME, isAdult: false, sort: SEARCH_MATCH) { ${MEDIA_FIELDS} }
    }
  }
`;

const DETAILS_QUERY = `
  query Details($id: Int!) {
    Media(id: $id, type: ANIME) { ${MEDIA_FIELDS} }
  }
`;

const RECOMMENDATIONS_QUERY = `
  query Recommendations($id: Int!, $perPage: Int!) {
    Media(id: $id, type: ANIME) {
      recommendations(sort: RATING_DESC, perPage: $perPage) {
        nodes { mediaRecommendation { ${MEDIA_FIELDS} } }
      }
    }
  }
`;

// ── Esquemas ─────────────────────────────────────────────────────────────────

const mediaSchema = z.object({
  id: z.number(),
  title: z.object({
    romaji: z.string().nullish(),
    english: z.string().nullish(),
    native: z.string().nullish(),
  }),
  format: z.string().nullish(),
  episodes: z.number().nullish(),
  duration: z.number().nullish(),
  seasonYear: z.number().nullish(),
  startDate: z.object({ year: z.number().nullish() }).nullish(),
  coverImage: z.object({ large: z.string().nullish(), extraLarge: z.string().nullish() }).nullish(),
  bannerImage: z.string().nullish(),
  description: z.string().nullish(),
  genres: z.array(z.string()).nullish(),
  isAdult: z.boolean().nullish(),
  popularity: z.number().nullish(),
  tags: z
    .array(
      z.object({
        name: z.string(),
        rank: z.number().nullish(),
        isMediaSpoiler: z.boolean().nullish(),
        isAdult: z.boolean().nullish(),
      }),
    )
    .nullish(),
  studios: z.object({ nodes: z.array(z.object({ name: z.string() })) }).nullish(),
});
type Media = z.infer<typeof mediaSchema>;

const errorsSchema = z.array(z.object({ message: z.string(), status: z.number().optional() })).optional();

const searchSchema = z.object({
  data: z.object({ Page: z.object({ media: z.array(mediaSchema.nullable()) }) }),
});
const detailsSchema = z.object({ data: z.object({ Media: mediaSchema.nullable() }) });
const recommendationsSchema = z.object({
  data: z.object({
    Media: z
      .object({
        recommendations: z.object({
          nodes: z.array(z.object({ mediaRecommendation: mediaSchema.nullable() }).nullable()),
        }),
      })
      .nullable(),
  }),
});

function displayTitle(m: Media) {
  return m.title.english || m.title.romaji || m.title.native || "";
}

function toSearchItem(m: Media): ProviderSearchItem {
  const title = displayTitle(m);
  const original = m.title.native || m.title.romaji || null;
  return {
    source: "ANILIST",
    externalId: String(m.id),
    tmdbId: null,
    type: "ANIME",
    title,
    originalTitle: original && original !== title ? original : null,
    altTitles: unique([m.title.english, m.title.romaji, m.title.native].filter((t): t is string => !!t)),
    year: m.seasonYear ?? m.startDate?.year ?? null,
    posterUrl: m.coverImage?.large ?? m.coverImage?.extraLarge ?? null,
    overview: stripHtml(m.description),
    popularity: anilistPopularity(m.popularity),
    animeCandidate: false,
  };
}

export type AniListProviderOptions = Omit<HttpClientOptions, "source"> & { baseUrl?: string };

/** Anime de AniList (GraphQL público, sin clave). Filtra contenido adulto y tags con spoilers. */
export function createAniListProvider({
  baseUrl = ANILIST_API_URL,
  ...http
}: AniListProviderOptions = {}): MediaProvider {
  const request = createHttpClient({ source: "ANILIST", ...http });

  async function query<T>(
    gql: string,
    variables: Record<string, unknown>,
    schema: z.ZodType<T>,
    signal?: AbortSignal,
  ) {
    let res: Response;
    try {
      res = await request(baseUrl, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ query: gql, variables }),
        ...(signal && { signal }),
      });
    } catch (error) {
      // AniList responde 404 (con `errors`) cuando el id no existe.
      if (error instanceof ProviderError && error.status === 404) return null;
      throw error;
    }
    const body: unknown = await res.json();
    const errors = errorsSchema.safeParse((body as { errors?: unknown })?.errors);
    if (errors.success && errors.data?.length) {
      if (errors.data.every((e) => e.status === 404)) return null;
      throw new ProviderError("ANILIST", res.status, `AniList: ${errors.data[0]!.message}`);
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success)
      throw new ProviderError("ANILIST", res.status, "AniList devolvió un formato inesperado");
    return { data: parsed.data, body };
  }

  const visible = (m: Media | null): m is Media => !!m && m.isAdult !== true;

  return {
    source: "ANILIST",

    async search(searchQuery: string, { type, limit = 20, signal }: SearchOptions = {}) {
      if (type && type !== "ANIME") return [];
      const result = await query(SEARCH_QUERY, { search: searchQuery, perPage: limit }, searchSchema, signal);
      return (result?.data.data.Page.media ?? []).filter(visible).map(toSearchItem);
    },

    async getDetails(externalId, { signal } = {}) {
      const id = Number(externalId);
      if (!Number.isInteger(id) || id <= 0) return null;
      const result = await query(DETAILS_QUERY, { id }, detailsSchema, signal);
      const m = result?.data.data.Media;
      if (!visible(m ?? null) || !m) return null;

      const item = toSearchItem(m);
      return {
        source: "ANILIST",
        externalId: String(m.id),
        tmdbId: null,
        type: "ANIME",
        title: item.title,
        originalTitle: item.originalTitle,
        year: item.year,
        posterPath: m.coverImage?.extraLarge ?? m.coverImage?.large ?? null,
        backdropPath: m.bannerImage ?? null,
        overview: item.overview,
        genres: m.genres ?? [],
        tags: (m.tags ?? [])
          .filter((t) => !t.isMediaSpoiler && !t.isAdult)
          .sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0))
          .slice(0, 20)
          .map((t) => t.name),
        people: (m.studios?.nodes ?? []).map((s) => s.name),
        runtimeMin: m.duration ?? null,
        episodes: m.episodes ?? null,
        seasons: null,
        raw: result?.body,
      } satisfies ProviderTitle;
    },

    async getRecommendations(externalId, { limit = 20, signal } = {}) {
      const id = Number(externalId);
      if (!Number.isInteger(id) || id <= 0) return [];
      const result = await query(
        RECOMMENDATIONS_QUERY,
        { id, perPage: limit },
        recommendationsSchema,
        signal,
      );
      return (result?.data.data.Media?.recommendations.nodes ?? [])
        .map((node) => node?.mediaRecommendation ?? null)
        .filter(visible)
        .map(toSearchItem);
    },
  };
}
