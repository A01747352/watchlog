# Watchlog

[![CI](https://github.com/dCarreonAg/watchlog/actions/workflows/ci.yml/badge.svg)](https://github.com/dCarreonAg/watchlog/actions/workflows/ci.yml)

Webapp personal para registrar películas, series y anime, calificarlos y recibir recomendaciones explicables.
La especificación completa está en [docs/SPEC.md](docs/SPEC.md) y el diseño en [docs/design/](docs/design/).

> Estado: **Fase 2 · Datos y auth** (Prisma + Postgres, Better Auth con registro por invitación y rutas
> protegidas).

## Stack

Monorepo **pnpm + Turborepo** en TypeScript estricto.

| Ruta                 | Qué es                                                           |
| -------------------- | ---------------------------------------------------------------- |
| `apps/web`           | Frontend Next.js 16 (App Router) + Tailwind CSS v4 + next-themes |
| `apps/api`           | Backend Hono sobre Node + Better Auth (`/api/*`, `/health`)      |
| `packages/db`        | Prisma 7: esquema, migraciones, seed y cliente                   |
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
