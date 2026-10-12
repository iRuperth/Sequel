import {
  API_ROUTES,
  cancelQueryRequestSchema,
  cancelQueryResponseSchema,
  executeQueryRequestSchema,
  executeQueryResponseSchema,
  executionDetailSchema,
  explainRequestSchema,
  explainResponseSchema,
  historyPageSchema,
  historyQuerySchema,
  idParamsSchema,
  schemaTreeSchema,
} from "@sequel/contracts"
import type { RouteModule } from "../lib/types"

export const queryRoutes: RouteModule = (app, { core }) => {
  app.get(
    API_ROUTES.schema.pattern,
    { schema: { response: { 200: schemaTreeSchema } } },
    async (request) => core.warehouse.schemaTree(await core.sandbox.activeSchema(request.userId)),
  )

  app.post(
    API_ROUTES.queries.execute.pattern,
    { schema: { body: executeQueryRequestSchema, response: { 200: executeQueryResponseSchema } } },
    (request) =>
      core.queries.execute({
        userId: request.userId,
        sql: request.body.sql,
        mode: request.body.mode,
        requestId: request.body.requestId,
      }),
  )

  app.post(
    API_ROUTES.queries.explain.pattern,
    { schema: { body: explainRequestSchema, response: { 200: explainResponseSchema } } },
    (request) => core.queries.explain(request.userId, request.body.sql, request.body.analyze),
  )

  app.post(
    API_ROUTES.queries.cancel.pattern,
    { schema: { body: cancelQueryRequestSchema, response: { 200: cancelQueryResponseSchema } } },
    async (request) => ({ cancelled: await core.queries.cancel(request.body.requestId) }),
  )

  app.get(
    API_ROUTES.queries.history.pattern,
    { schema: { querystring: historyQuerySchema, response: { 200: historyPageSchema } } },
    (request) => core.queries.history(request.userId, request.query),
  )

  app.get(
    API_ROUTES.queries.historyDetail.pattern,
    { schema: { params: idParamsSchema, response: { 200: executionDetailSchema } } },
    (request) => core.queries.detail(request.userId, request.params.id),
  )
}
