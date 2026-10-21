# syntax=docker/dockerfile:1
# Imagen de apps/web (Next.js standalone). Se afina con turbo prune en la Fase 9.
FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS prune
COPY . .
RUN pnpm dlx turbo@2 prune web --docker

FROM base AS build
COPY --from=prune /repo/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=prune /repo/out/full/ .
# rewrites() de Next se resuelven al compilar: API_URL tiene que existir aquí.
ARG API_URL=http://api:3001
ENV NEXT_TELEMETRY_DISABLED=1 NEXT_OUTPUT_STANDALONE=1 API_URL=$API_URL
RUN pnpm turbo run build --filter=web

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
