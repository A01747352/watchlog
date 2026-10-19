# syntax=docker/dockerfile:1
# Imagen de apps/api (Hono sobre Node). Se afina con turbo prune en la Fase 9.
FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS prune
COPY . .
RUN pnpm dlx turbo@2 prune api --docker

FROM base AS build
COPY --from=prune /repo/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=prune /repo/out/full/ .
RUN pnpm turbo run build --filter=api

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3001
# dist/ es un bundle autocontenido (tsup con noExternal).
COPY --from=build --chown=node:node /repo/apps/api/dist ./dist
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:3001/health || exit 1
CMD ["node", "dist/index.js"]
