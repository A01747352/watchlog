import {
  type AddToLibraryResponse,
  addToLibraryRequestSchema,
  addViewingRequestSchema,
  type ApiError,
  type LibraryEntryResponse,
  type LibraryTagsResponse,
  updateLibraryEntryRequestSchema,
} from "@watchlog/contracts";
import type { DbClient } from "@watchlog/db";
import { type Context, Hono } from "hono";
import type { z } from "zod";

import type { Auth } from "../auth";
import { requireSession, type SessionVariables } from "../middleware/session";
import {
  addToLibrary,
  addViewing,
  deleteEntry,
  getEntry,
  LibraryError,
  type LibraryProviders,
  updateEntry,
  userTags,
} from "../services/library";

const errorStatus = { ENTRY_NOT_FOUND: 404, TITLE_NOT_FOUND: 404, PROVIDER_UNAVAILABLE: 502 } as const;

/** Lee y valida el cuerpo JSON con un esquema del contrato; responde 400 si no cumple. */
async function parseBody<S extends z.ZodType>(c: Context, schema: S) {
  const parsed = schema.safeParse(await c.req.json().catch(() => null));
  if (parsed.success) return { ok: true as const, data: parsed.data as z.infer<S> };
  const message = parsed.error.issues[0]?.message ?? "Petición inválida.";
  return {
    ok: false as const,
    response: c.json<ApiError>({ error: { code: "INVALID_REQUEST", message } }, 400),
  };
}

/** Rutas de la biblioteca del usuario (`/api/library`). Todas exigen sesión. */
export function libraryRoute({
  db,
  auth,
  providers,
}: {
  db: DbClient;
  auth: Auth;
  providers: LibraryProviders;
}) {
  return new Hono<{ Variables: SessionVariables }>()
    .use(requireSession(auth))
    .onError((error, c) => {
      if (error instanceof LibraryError) {
        return c.json<ApiError>(
          { error: { code: error.code, message: error.message } },
          errorStatus[error.code],
        );
      }
      throw error;
    })
    .post("/", async (c) => {
      const body = await parseBody(c, addToLibraryRequestSchema);
      if (!body.ok) return body.response;
      const result = await addToLibrary(db, providers, c.var.user.id, body.data);
      return c.json<AddToLibraryResponse>(result, result.created ? 201 : 200);
    })
    .get("/tags", async (c) => c.json<LibraryTagsResponse>({ tags: await userTags(db, c.var.user.id) }))
    .get("/:id", async (c) =>
      c.json<LibraryEntryResponse>({ entry: await getEntry(db, c.var.user.id, c.req.param("id")) }),
    )
    .patch("/:id", async (c) => {
      const body = await parseBody(c, updateLibraryEntryRequestSchema);
      if (!body.ok) return body.response;
      const entry = await updateEntry(db, c.var.user.id, c.req.param("id"), body.data);
      return c.json<LibraryEntryResponse>({ entry });
    })
    .delete("/:id", async (c) => {
      await deleteEntry(db, c.var.user.id, c.req.param("id"));
      return c.body(null, 204);
    })
    .post("/:id/viewings", async (c) => {
      const body = await parseBody(c, addViewingRequestSchema);
      if (!body.ok) return body.response;
      const entry = await addViewing(db, c.var.user.id, c.req.param("id"), body.data);
      return c.json<LibraryEntryResponse>({ entry }, 201);
    });
}
