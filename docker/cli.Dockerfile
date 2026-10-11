ARG NODE_IMAGE=node:22-alpine

FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=true
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @sequel/cli build
RUN pnpm deploy --legacy --config.node-linker=hoisted --filter @sequel/cli --prod /prod

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /prod/node_modules ./node_modules
COPY --from=build --chown=node:node /prod/package.json ./package.json
COPY --from=build --chown=node:node /repo/apps/cli/dist ./dist
USER node
ENTRYPOINT ["node", "--enable-source-maps", "dist/main.js"]
CMD ["setup"]
