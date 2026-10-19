# Watchlog

[![CI](https://github.com/A01747352/watchlog/actions/workflows/ci.yml/badge.svg)](https://github.com/A01747352/watchlog/actions/workflows/ci.yml)

Webapp personal para registrar películas, series y anime, calificarlos y recibir recomendaciones explicables.
La especificación completa está en [docs/SPEC.md](docs/SPEC.md) y el diseño en [docs/design/](docs/design/).

> Estado: **Fase 1 · Fundaciones** (monorepo, tooling, sistema de diseño y endpoint `/health`).

## Stack

Monorepo **pnpm + Turborepo** en TypeScript estricto.

| Ruta                 | Qué es                                                           |
| -------------------- | ---------------------------------------------------------------- |
| `apps/web`           | Frontend Next.js 16 (App Router) + Tailwind CSS v4 + next-themes |
| `apps/api`           | Backend Hono sobre Node (`GET /health`)                          |
| `packages/ui`        | Tokens de diseño (variables CSS + `@theme`) y componentes shadcn |
| `packages/contracts` | Esquemas Zod compartidos front ↔ back                            |
| `packages/config`    | tsconfig, ESLint (con la regla de dependencias) y Prettier       |

`apps/web` solo puede importar `contracts` y `ui`; ESLint lo hace cumplir.

## Requisitos

- Node 24 (`.nvmrc`) y pnpm 12 (`corepack enable`)
- Docker (opcional, para Postgres y las imágenes)

## Puesta en marcha

```bash
pnpm install
cp .env.example .env
pnpm dev                 # web en :3000, api en :3001
docker compose up db     # Postgres 16 (se usa a partir de la Fase 2)
```

## Comandos

| Comando          | Qué hace                             |
| ---------------- | ------------------------------------ |
| `pnpm dev`       | Levanta web y api en modo desarrollo |
| `pnpm build`     | Compila todo (Turborepo, con caché)  |
| `pnpm lint`      | ESLint en todos los paquetes         |
| `pnpm typecheck` | `tsc --noEmit` en todos los paquetes |
| `pnpm test`      | Vitest (unitarios e integración)     |
| `pnpm test:e2e`  | Playwright contra la build de web    |
| `pnpm format`    | Prettier                             |

Filtra por app con `pnpm --filter web <cmd>` o `pnpm --filter api <cmd>`.

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
