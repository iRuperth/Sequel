import {
  API_ROUTES,
  catalogSearchQuerySchema,
  catalogSearchResultSchema,
  catalogTableDetailSchema,
  datasetDetailSchema,
  datasetListSchema,
  datasetParamsSchema,
  runTriggeredSchema,
  tableParamsSchema,
} from "@sequel/contracts"
import type { RouteModule } from "../lib/types"

const ACCEPTED = 202

export const catalogRoutes: RouteModule = (app, { core }) => {
  app.get(
    API_ROUTES.catalog.datasets.pattern,
    { schema: { response: { 200: datasetListSchema } } },
    async () => ({
      items: await core.catalog.datasets(),
    }),
  )

  app.get(
    API_ROUTES.catalog.dataset.pattern,
    { schema: { params: datasetParamsSchema, response: { 200: datasetDetailSchema } } },
    (request) => core.catalog.dataset(request.params.slug),
  )

  app.get(
    API_ROUTES.catalog.table.pattern,
    { schema: { params: tableParamsSchema, response: { 200: catalogTableDetailSchema } } },
    (request) => core.catalog.table(request.params.schema, request.params.table),
  )

  app.get(
    API_ROUTES.catalog.search.pattern,
    {
      schema: {
        querystring: catalogSearchQuerySchema,
        response: { 200: catalogSearchResultSchema },
      },
    },
    (request) => core.catalog.search(request.query.q),
  )

  app.post(
    API_ROUTES.catalog.refresh.pattern,
    { schema: { response: { [ACCEPTED]: runTriggeredSchema } } },
    async (request, reply) => {
      const jobId = await core.jobs.enqueue(
        "catalog_refresh",
        {},
        { userId: request.userId, subjectId: null },
      )
      return reply.status(ACCEPTED).send({ jobId })
    },
  )
}
