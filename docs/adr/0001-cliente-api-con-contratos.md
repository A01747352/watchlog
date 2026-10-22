# ADR 0001 · Cliente de la API basado en contratos Zod, no en Hono RPC

- **Estado:** aceptada (Fase 3)
- **Fecha:** 2026-10-22

## Contexto

La SPEC propone que `apps/web` use el cliente RPC de Hono (`hc<AppType>`) para que un cambio en la
API rompa el build del front. Para eso, web tiene que importar el tipo `AppType` desde `apps/api`.

Al implementarlo chocan dos reglas del propio proyecto:

1. **Regla de dependencias:** `apps/web` solo importa `packages/contracts` y `packages/ui`. Importar
   `AppType` (aunque sea `import type`) hace que el typecheck de web cargue todo el grafo de tipos de
   la API: Better Auth, Prisma y `packages/db`, `packages/providers`.
2. **"Cada endpoint nuevo empieza por su esquema en `packages/contracts`":** los esquemas ya
   describen cada petición y respuesta.

Además, RPC solo da garantías en tiempo de compilación: no valida lo que llega por la red.

## Decisión

- Cada endpoint define en `packages/contracts` el esquema de su entrada y de su respuesta.
- La API tipa sus respuestas con esos tipos (`c.json<SearchResponse>(…)`), así que no compila si
  devuelve otra forma.
- Web llama con `apiFetch(ruta, esquema)` (`apps/web/src/lib/api-client.ts`), que **valida** la
  respuesta con el mismo esquema en tiempo de ejecución.

Un cambio incompatible en un contrato rompe el build de la API y el de web a la vez, que era el
objetivo de RPC, sin que web dependa de `apps/api`.

## Consecuencias

- Las rutas y los métodos HTTP no están tipados de extremo a extremo (sí los cuerpos). Es un riesgo
  menor: cada ruta se usa en pocos sitios y los tests E2E cubren los flujos.
- Si en el futuro conviene RPC, puede añadirse sin romper nada: los esquemas siguen siendo la fuente
  de verdad.
