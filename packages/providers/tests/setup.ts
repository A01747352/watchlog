import { afterAll, afterEach, beforeAll } from "vitest";

import { server } from "./msw";

// Cualquier petición sin handler falla: los tests nunca salen a TMDB ni a AniList.
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
