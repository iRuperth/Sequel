ARG NODE_IMAGE=node:22-alpine

FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=true NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /repo

FROM base AS build
ARG API_URL
ARG API_BASE_PATH
ARG JOB_POLL_INTERVAL_MS
ARG APP_VERSION
ENV API_URL=${API_URL} API_BASE_PATH=${API_BASE_PATH} JOB_POLL_INTERVAL_MS=${JOB_POLL_INTERVAL_MS} APP_VERSION=${APP_VERSION}
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @sequel/web build

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
USER node
EXPOSE 3030
CMD ["sh", "-c", "PORT=${WEB_PORT} exec node apps/web/server.js"]
