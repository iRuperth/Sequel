import {
  API_ROUTES,
  createSavedQueryRequestSchema,
  idParamsSchema,
  sandboxSessionResponseSchema,
  savedQueryListQuerySchema,
  savedQueryListSchema,
  savedQuerySchema,
  updateSavedQueryRequestSchema,
} from "@sequel/contracts"
import type { RouteModule } from "../lib/types"

const CREATED = 201
const NO_CONTENT = 204

export const workspaceRoutes: RouteModule = (app, { core }) => {
  app.get(
    API_ROUTES.savedQueries.collection.pattern,
    { schema: { querystring: savedQueryListQuerySchema, response: { 200: savedQueryListSchema } } },
    async (request) => ({ items: await core.savedQueries.list(request.userId, request.query) }),
  )

  app.post(
    API_ROUTES.savedQueries.collection.pattern,
    { schema: { body: createSavedQueryRequestSchema, response: { [CREATED]: savedQuerySchema } } },
    async (request, reply) =>
      reply.status(CREATED).send(await core.savedQueries.create(request.userId, request.body)),
  )

  app.get(
    API_ROUTES.savedQueries.item.pattern,
    { schema: { params: idParamsSchema, response: { 200: savedQuerySchema } } },
    (request) => core.savedQueries.get(request.userId, request.params.id),
  )

  app.patch(
    API_ROUTES.savedQueries.item.pattern,
    {
      schema: {
        params: idParamsSchema,
        body: updateSavedQueryRequestSchema,
        response: { 200: savedQuerySchema },
      },
    },
    (request) => core.savedQueries.update(request.userId, request.params.id, request.body),
  )

  app.delete(
    API_ROUTES.savedQueries.item.pattern,
    { schema: { params: idParamsSchema } },
    async (request, reply) => {
      await core.savedQueries.remove(request.userId, request.params.id)
      return reply.status(NO_CONTENT).send()
    },
  )

  app.get(
    API_ROUTES.sandbox.session.pattern,
    { schema: { response: { 200: sandboxSessionResponseSchema } } },
    async (request) => ({
      session: await core.sandbox.describe(await core.sandbox.active(request.userId)),
    }),
  )

  app.post(
    API_ROUTES.sandbox.session.pattern,
    { schema: { response: { 200: sandboxSessionResponseSchema } } },
    async (request) => {
      const session = await core.sandbox.ensure(request.userId)
      await core.warehouse.invalidateSchemaTree(session.schemaName)
      return { session: await core.sandbox.describe(session) }
    },
  )

  app.post(
    API_ROUTES.sandbox.reset.pattern,
    { schema: { response: { 200: sandboxSessionResponseSchema } } },
    async (request) => {
      const session = await core.sandbox.reset(request.userId)
      await core.warehouse.invalidateSchemaTree(session.schemaName)
      return { session: await core.sandbox.describe(session) }
    },
  )
}
