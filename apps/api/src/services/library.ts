import type {
  AddToLibraryRequest,
  AddViewingRequest,
  LibraryEntry,
  LibraryStatus,
  Source,
  UpdateLibraryEntryRequest,
} from "@watchlog/contracts";
import { type DbClient, Prisma } from "@watchlog/db";
import { type MediaProvider, ProviderError, tmdbImageUrl } from "@watchlog/providers";

export type LibraryProviders = { tmdb?: MediaProvider | undefined; anilist?: MediaProvider | undefined };

export type LibraryErrorCode = "ENTRY_NOT_FOUND" | "TITLE_NOT_FOUND" | "PROVIDER_UNAVAILABLE";

export class LibraryError extends Error {
  constructor(
    readonly code: LibraryErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "LibraryError";
  }
}

const entryInclude = {
  title: true,
  viewings: { orderBy: [{ watchedOn: "desc" }, { id: "desc" }] },
} satisfies Prisma.LibraryEntryInclude;

type EntryWithRelations = Prisma.LibraryEntryGetPayload<{ include: typeof entryInclude }>;

/** Quita las claves `undefined` (los parciales de Zod las traen; Prisma no las acepta). */
function defined<T extends object>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as {
    [K in keyof T]?: Exclude<T[K], undefined>;
  };
}

// ── Fechas de calendario ─────────────────────────────────────────────────────

/** `YYYY-MM-DD` → medianoche UTC (los visionados son días, no instantes). */
export const fromCalendarDate = (date: string) => new Date(`${date}T00:00:00.000Z`);
export const toCalendarDate = (date: Date) => date.toISOString().slice(0, 10);
const today = (now: Date) => fromCalendarDate(toCalendarDate(now));

// ── Serialización según el contrato ──────────────────────────────────────────

/** TMDB guarda rutas (`/abc.jpg`); AniList, URLs completas. */
const posterUrl = (path: string | null) => (path?.startsWith("/") ? tmdbImageUrl(path) : path);

export function serializeEntry(entry: EntryWithRelations): LibraryEntry {
  const { title } = entry;
  return {
    id: entry.id,
    status: entry.status,
    rating: entry.rating === null ? null : entry.rating.toNumber(),
    review: entry.review,
    reviewSpoilers: entry.reviewSpoilers,
    favorite: entry.favorite,
    userTags: entry.userTags,
    currentSeason: entry.currentSeason,
    currentEpisode: entry.currentEpisode,
    startedAt: entry.startedAt?.toISOString() ?? null,
    finishedAt: entry.finishedAt?.toISOString() ?? null,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    title: {
      id: title.id,
      source: title.source,
      externalId: title.externalId,
      type: title.type,
      title: title.title,
      year: title.year,
      posterUrl: posterUrl(title.posterPath),
      episodes: title.episodes,
      seasons: title.seasons,
    },
    viewings: entry.viewings.map((v) => ({ id: v.id, watchedOn: toCalendarDate(v.watchedOn), note: v.note })),
  };
}

// ── Títulos (caché local de los proveedores) ─────────────────────────────────

function providerFor(providers: LibraryProviders, source: Source) {
  return source === "TMDB" ? providers.tmdb : providers.anilist;
}

/**
 * Devuelve el `Title` local o lo trae del proveedor y lo guarda (docs/SPEC.md, "Caché local de
 * títulos"): la API lee de Postgres, no de la API externa.
 */
export async function ensureTitle(
  db: DbClient,
  providers: LibraryProviders,
  { source, externalId, tmdbId }: Pick<AddToLibraryRequest, "source" | "externalId" | "tmdbId">,
) {
  const existing = await db.title.findUnique({ where: { source_externalId: { source, externalId } } });
  if (existing) {
    // La búsqueda puede haber descubierto la referencia cruzada a TMDB después.
    if (tmdbId && existing.tmdbId === null) {
      return db.title.update({ where: { id: existing.id }, data: { tmdbId } });
    }
    return existing;
  }

  const provider = providerFor(providers, source);
  if (!provider) throw new LibraryError("PROVIDER_UNAVAILABLE", `${source} no está configurado.`);

  let details;
  try {
    details = await provider.getDetails(externalId);
  } catch (error) {
    if (error instanceof ProviderError) {
      throw new LibraryError(
        "PROVIDER_UNAVAILABLE",
        "No se pudo obtener la ficha del título. Inténtalo en un momento.",
      );
    }
    throw error;
  }
  if (!details) throw new LibraryError("TITLE_NOT_FOUND", "Ese título no existe en el catálogo.");

  const data = {
    tmdbId: details.tmdbId ?? tmdbId ?? null,
    type: details.type,
    title: details.title,
    originalTitle: details.originalTitle,
    year: details.year,
    posterPath: details.posterPath,
    backdropPath: details.backdropPath,
    overview: details.overview,
    genres: details.genres,
    tags: details.tags,
    people: details.people,
    runtimeMin: details.runtimeMin,
    episodes: details.episodes,
    seasons: details.seasons,
    raw: (details.raw ?? {}) as Prisma.InputJsonValue,
    fetchedAt: new Date(),
  };
  // upsert: dos peticiones simultáneas por el mismo título no deben chocar.
  return db.title.upsert({
    where: { source_externalId: { source, externalId } },
    create: { source, externalId, ...data },
    update: {},
  });
}

// ── Entradas de biblioteca ───────────────────────────────────────────────────

async function findOwnEntry(db: DbClient, userId: string, entryId: string) {
  const entry = await db.libraryEntry.findFirst({ where: { id: entryId, userId }, include: entryInclude });
  if (!entry) throw new LibraryError("ENTRY_NOT_FOUND", "Esa entrada no existe en tu biblioteca.");
  return entry;
}

/** Fechas que acompañan a un cambio de estado (sin pisar las que ya existen). */
function statusDates(
  status: LibraryStatus,
  current: { startedAt: Date | null; finishedAt: Date | null },
  when: Date,
) {
  return {
    ...(status === "WATCHING" && !current.startedAt && { startedAt: when }),
    ...(status === "COMPLETED" && !current.finishedAt && { finishedAt: when }),
  };
}

/**
 * Añade un título a la biblioteca en un paso ("Pendiente" o "Visto" desde la búsqueda).
 * Si ya estaba, la devuelve sin tocarla (`created: false`).
 */
export async function addToLibrary(
  db: DbClient,
  providers: LibraryProviders,
  userId: string,
  input: AddToLibraryRequest,
  now = new Date(),
) {
  const title = await ensureTitle(db, providers, input);

  const existing = await db.libraryEntry.findUnique({
    where: { userId_titleId: { userId, titleId: title.id } },
    include: entryInclude,
  });
  if (existing) return { created: false, entry: serializeEntry(existing) };

  const watchedOn = input.watchedOn ? fromCalendarDate(input.watchedOn) : today(now);
  try {
    const entry = await db.libraryEntry.create({
      data: {
        userId,
        titleId: title.id,
        status: input.status,
        ...statusDates(
          input.status,
          { startedAt: null, finishedAt: null },
          input.status === "COMPLETED" ? watchedOn : now,
        ),
        ...(input.status === "COMPLETED" && { viewings: { create: { watchedOn } } }),
      },
      include: entryInclude,
    });
    return { created: true, entry: serializeEntry(entry) };
  } catch (error) {
    // Doble clic: otra petición creó la entrada entre la búsqueda y el create.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const entry = await db.libraryEntry.findUniqueOrThrow({
        where: { userId_titleId: { userId, titleId: title.id } },
        include: entryInclude,
      });
      return { created: false, entry: serializeEntry(entry) };
    }
    throw error;
  }
}

/** ¿El progreso marca el final? Solo cuando sabemos el total y no hay temporadas de por medio. */
function reachedEnd(title: EntryWithRelations["title"], season: number | null, episode: number | null) {
  if (episode === null || !title.episodes) return false;
  const singleSeason = title.type === "ANIME" || (title.seasons ?? 1) <= 1;
  return singleSeason && (season ?? 1) <= 1 && episode >= title.episodes;
}

/**
 * Edición parcial de una entrada propia. Reglas:
 * - Pasar a Viendo/Terminado fecha el inicio/fin si aún no lo estaba.
 * - Llegar al último episodio (cuando se conoce el total) la marca como Terminada (HANDOFF §4).
 * - `watchedOn` fecha el visionado más reciente, o crea uno si no hay.
 */
export async function updateEntry(
  db: DbClient,
  userId: string,
  entryId: string,
  patch: UpdateLibraryEntryRequest,
  now = new Date(),
) {
  const entry = await findOwnEntry(db, userId, entryId);
  const { watchedOn, ...fields } = defined(patch);

  const season = fields.currentSeason !== undefined ? fields.currentSeason : entry.currentSeason;
  const episode = fields.currentEpisode !== undefined ? fields.currentEpisode : entry.currentEpisode;
  let status = fields.status ?? entry.status;
  if (
    fields.currentEpisode !== undefined &&
    fields.status === undefined &&
    reachedEnd(entry.title, season, episode)
  ) {
    status = "COMPLETED";
  }
  if (fields.currentEpisode && status === "PLANNED" && fields.status === undefined) status = "WATCHING";

  const latestViewing = entry.viewings[0];
  const updated = await db.libraryEntry.update({
    where: { id: entry.id },
    data: {
      ...fields,
      ...(fields.review !== undefined && { review: fields.review || null }),
      ...(fields.userTags && { userTags: [...new Set(fields.userTags)] }),
      status,
      ...statusDates(status, entry, now),
      ...(watchedOn && {
        viewings: latestViewing
          ? { update: { where: { id: latestViewing.id }, data: { watchedOn: fromCalendarDate(watchedOn) } } }
          : { create: { watchedOn: fromCalendarDate(watchedOn) } },
      }),
    },
    include: entryInclude,
  });
  return serializeEntry(updated);
}

export async function deleteEntry(db: DbClient, userId: string, entryId: string) {
  await findOwnEntry(db, userId, entryId);
  await db.libraryEntry.delete({ where: { id: entryId } });
}

/** Registra un re-visionado. Si la entrada no estaba terminada, pasa a Terminada. */
export async function addViewing(db: DbClient, userId: string, entryId: string, input: AddViewingRequest) {
  const entry = await findOwnEntry(db, userId, entryId);
  const watchedOn = fromCalendarDate(input.watchedOn);
  const updated = await db.libraryEntry.update({
    where: { id: entry.id },
    data: {
      status: "COMPLETED",
      ...statusDates("COMPLETED", entry, watchedOn),
      viewings: { create: { watchedOn, note: input.note || null } },
    },
    include: entryInclude,
  });
  return serializeEntry(updated);
}

export async function getEntry(db: DbClient, userId: string, entryId: string) {
  return serializeEntry(await findOwnEntry(db, userId, entryId));
}

/** Etiquetas propias del usuario, de más a menos usadas. */
export async function userTags(db: DbClient, userId: string) {
  const rows = await db.$queryRaw<Array<{ tag: string }>>`
    SELECT tag
    FROM "LibraryEntry", unnest("userTags") AS tag
    WHERE "userId" = ${userId}
    GROUP BY tag
    ORDER BY count(*) DESC, tag ASC
    LIMIT 50
  `;
  return rows.map((row) => row.tag);
}

/** Estado en la biblioteca de una lista de resultados de búsqueda (para marcar "Terminado", etc.). */
export async function libraryStatusByRef(
  db: DbClient,
  userId: string,
  refs: Array<{ source: Source; externalId: string }>,
) {
  if (refs.length === 0) return new Map<string, { entryId: string; status: LibraryStatus }>();
  const entries = await db.libraryEntry.findMany({
    where: { userId, title: { OR: refs.map(({ source, externalId }) => ({ source, externalId })) } },
    select: { id: true, status: true, title: { select: { source: true, externalId: true } } },
  });
  return new Map(
    entries.map((e) => [`${e.title.source}:${e.title.externalId}`, { entryId: e.id, status: e.status }]),
  );
}
