# Watchlog

[![CI](https://github.com/dCarreonAg/watchlog/actions/workflows/ci.yml/badge.svg)](https://github.com/dCarreonAg/watchlog/actions/workflows/ci.yml)

Webapp personal para registrar películas, series y anime, calificarlos y recibir recomendaciones explicables.
La especificación completa está en [docs/SPEC.md](docs/SPEC.md) y el diseño en [docs/design/](docs/design/).

> Estado: **Fase 4 · Registro** (buscar y registrar en un clic, calificar con medios puntos, reseña,
> etiquetas, progreso y re-visionados).

## Stack

Monorepo **pnpm + Turborepo** en TypeScript estricto.

| Ruta                 | Qué es                                                           |
| -------------------- | ---------------------------------------------------------------- |
| `apps/web`           | Frontend Next.js 16 (App Router) + Tailwind CSS v4 + next-themes |
| `apps/api`           | Backend Hono sobre Node + Better Auth (`/api/*`, `/health`)      |
| `packages/db`        | Prisma 7: esquema, migraciones, seed y cliente                   |
| `packages/providers` | `MediaProvider`, clientes de TMDB y AniList, búsqueda unificada  |
| `packages/ui`        | Tokens de diseño (variables CSS + `@theme`) y componentes shadcn |
| `packages/contracts` | Esquemas Zod compartidos front ↔ back                            |
| `packages/config`    | tsconfig, ESLint (con la regla de dependencias) y Prettier       |

`apps/web` solo puede importar `contracts` y `ui`; ESLint lo hace cumplir.

## Requisitos

- Node 24 (`.nvmrc`) y pnpm 12 (`corepack enable`)
- Docker (Postgres 16; también para las imágenes)

## Puesta en marcha

```bash
pnpm install
cp .env.example .env            # cambia BETTER_AUTH_SECRET: openssl rand -base64 32
docker compose up -d db         # Postgres 16
pnpm build --filter=@watchlog/db  # genera el cliente de Prisma
pnpm --filter db migrate:deploy # aplica las migraciones
pnpm --filter db seed           # crea la invitación de arranque (SEED_INVITE_CODE)
pnpm dev                        # web en :3000, api en :3001
```

El registro es **solo por invitación**. Tras el seed, crea tu cuenta en
<http://localhost:3000/signup?code=bienvenida> (o el código de `SEED_INVITE_CODE`). Desde el inicio
puedes generar enlaces de invitación para tus amigos (un uso, válidos 7 días).

GitHub y Google son opcionales: se activan al definir sus `*_CLIENT_ID` y `*_CLIENT_SECRET` en `.env`
(las URLs de callback están en `.env.example`).

Para levantarlo todo en contenedores (db, migraciones, api y web): `docker compose up --build`.

## Datos externos

Películas y series vienen de [TMDB](https://www.themoviedb.org/) y el anime de
[AniList](https://anilist.co/). Para TMDB pon tu "API Read Access Token" en `TMDB_READ_TOKEN`
(sin él, la búsqueda solo usa AniList); AniList no necesita clave. Solo `packages/providers` habla con
ellos, con reintentos ante 429/5xx, y los tests los simulan con MSW: la CI nunca llama a las APIs reales.

La búsqueda (`GET /api/search?q=…&type=all|movie|series|anime`) consulta ambos catálogos en paralelo,
muestra la versión de AniList de cada anime (guardando su id de TMDB) y ordena por coincidencia con la
búsqueda y popularidad. Si un proveedor falla, devuelve lo del otro.

Los E2E usan un servidor falso de TMDB y AniList (`apps/web/tests/e2e/mock-providers.mjs`) con las mismas
fixtures; la API lo apunta con `TMDB_API_URL` y `ANILIST_API_URL`, que en uso normal se dejan vacías.

## Registrar lo que ves

En **Buscar** (o con <kbd>⌘K</kbd> / <kbd>Ctrl</kbd>+<kbd>K</kbd> desde cualquier pantalla) cada resultado
tiene **Pendiente** y **Visto**. "Visto" lo marca como terminado con el visionado de hoy y el aviso ofrece
**Calificar** (nota de 1 a 10 con medios puntos, reseña corta, spoilers, etiquetas y fecha) o **Deshacer**.

| Tecla                       | Acción                     |
| --------------------------- | -------------------------- |
| <kbd>↑</kbd> <kbd>↓</kbd>   | Moverse por los resultados |
| <kbd>↵</kbd>                | Marcar como visto          |
| <kbd>Alt</kbd>+<kbd>P</kbd> | Añadir a pendientes        |
| <kbd>Esc</kbd>              | Limpiar la búsqueda        |

Si pulsas <kbd>↵</kbd> antes de que lleguen los resultados, se aplica al primero en cuanto llegan.

La API de biblioteca (`/api/library`) cubre además estados, progreso de episodios (al llegar al último
pasa a Terminado) y re-visionados; sus pantallas llegan con la ficha en la Fase 5.

## Comandos

| Comando          | Qué hace                             |
| ---------------- | ------------------------------------ |
| `pnpm dev`       | Levanta web y api en modo desarrollo |
| `pnpm build`     | Compila todo (Turborepo, con caché)  |
| `pnpm lint`      | ESLint en todos los paquetes         |
| `pnpm typecheck` | `tsc --noEmit` en todos los paquetes |
| `pnpm test`      | Vitest (la API, contra Postgres)     |
| `pnpm test:e2e`  | Playwright con api + web + Postgres  |
| `pnpm format`    | Prettier                             |

Filtra por app con `pnpm --filter web <cmd>` o `pnpm --filter api <cmd>`. Base de datos:
`pnpm --filter db migrate:dev`, `seed` o `studio`.

Los tests de la API y los E2E necesitan Postgres en marcha (`docker compose up -d db`); crean sus propias
bases (`watchlog_test` y `watchlog_e2e`), así que no tocan tus datos de desarrollo.

## Sistema de diseño

Los tokens de `docs/design/` viven en [`packages/ui/src/styles/tokens.css`](packages/ui/src/styles/tokens.css)
(tema oscuro por defecto, `.light` para el claro) y se exponen a Tailwind v4 en
[`globals.css`](packages/ui/src/styles/globals.css): `bg-brand`, `text-movie`, `text-h1`, `rounded-xl`,
`shadow-poster`, `aspect-poster`… No uses colores ni tamaños sueltos.

## Convenciones

- Conventional Commits con scope (`feat(web):`, `fix(api):`), validados por commitlint en el hook `commit-msg`.
- `lint-staged` formatea con Prettier en `pre-commit`.
- Una fase = una rama = un PR; `main` solo recibe PRs con la CI en verde.

## Licencia

MIT. Este producto usa la API de TMDB, pero no está respaldado ni certificado por TMDB.
