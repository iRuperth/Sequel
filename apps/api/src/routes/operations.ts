import {
  API_ROUTES,
  activityListSchema,
  activityQuerySchema,
  createDashboardRequestSchema,
  dashboardDataQuerySchema,
  dashboardDataSchema,
  dashboardListSchema,
  dashboardSchema,
  idParamsSchema,
  progressSummarySchema,
  qualityCheckListSchema,
  qualityCheckSchema,
  qualityOverviewSchema,
  qualityRunListSchema,
  runTriggeredSchema,
  scheduledQueryListSchema,
  scheduledQuerySchema,
  scheduledRunListSchema,
  skillListSchema,
  updateDashboardRequestSchema,
  upsertQualityCheckRequestSchema,
  upsertScheduledQueryRequestSchema,
  upsertWidgetRequestSchema,
  widgetParamsSchema,
  widgetSchema,
} from "@sequel/contracts"
import type { RouteModule } from "../lib/types"

const CREATED = 201
const ACCEPTED = 202
const NO_CONTENT = 204

export const progressRoutes: RouteModule = (app, { core }) => {
  app.get(
    API_ROUTES.progress.summary.pattern,
    { schema: { response: { 200: progressSummarySchema } } },
    (request) => core.progress.summary(request.userId),
  )

  app.get(
    API_ROUTES.progress.skills.pattern,
    { schema: { response: { 200: skillListSchema } } },
    async (request) => ({
      items: await core.progress.skillList(request.userId),
    }),
  )

  app.get(
    API_ROUTES.progress.activity.pattern,
    { schema: { querystring: activityQuerySchema, response: { 200: activityListSchema } } },
    async (request) => ({
      items: await core.progress.activity(request.userId, request.query.days),
    }),
  )
}

export const dashboardRoutes: RouteModule = (app, { core }) => {
  app.get(
    API_ROUTES.dashboards.collection.pattern,
    { schema: { response: { 200: dashboardListSchema } } },
    async (request) => ({
      items: await core.dashboards.list(request.userId),
    }),
  )

  app.post(
    API_ROUTES.dashboards.collection.pattern,
    { schema: { body: createDashboardRequestSchema, response: { [CREATED]: dashboardSchema } } },
    async (request, reply) =>
      reply.status(CREATED).send(await core.dashboards.create(request.userId, request.body)),
  )

  app.get(
    API_ROUTES.dashboards.item.pattern,
    { schema: { params: idParamsSchema, response: { 200: dashboardSchema } } },
    (request) => core.dashboards.get(request.userId, request.params.id),
  )

  app.patch(
    API_ROUTES.dashboards.item.pattern,
    {
      schema: {
        params: idParamsSchema,
        body: updateDashboardRequestSchema,
        response: { 200: dashboardSchema },
      },
    },
    (request) => core.dashboards.update(request.userId, request.params.id, request.body),
  )

  app.delete(
    API_ROUTES.dashboards.item.pattern,
    { schema: { params: idParamsSchema } },
    async (request, reply) => {
      await core.dashboards.remove(request.userId, request.params.id)
      return reply.status(NO_CONTENT).send()
    },
  )

  app.get(
    API_ROUTES.dashboards.data.pattern,
    {
      schema: {
        params: idParamsSchema,
        querystring: dashboardDataQuerySchema,
        response: { 200: dashboardDataSchema },
      },
    },
    (request) =>
      core.dashboards.data(request.userId, request.params.id, request.query.refresh === "true"),
  )

  app.post(
    API_ROUTES.dashboards.widgets.pattern,
    {
      schema: {
        params: idParamsSchema,
        body: upsertWidgetRequestSchema,
        response: { [CREATED]: widgetSchema },
      },
    },
    async (request, reply) =>
      reply
        .status(CREATED)
        .send(await core.dashboards.addWidget(request.userId, request.params.id, request.body)),
  )

  app.put(
    API_ROUTES.dashboards.widget.pattern,
    {
      schema: {
        params: widgetParamsSchema,
        body: upsertWidgetRequestSchema,
        response: { 200: widgetSchema },
      },
    },
    (request) =>
      core.dashboards.updateWidget(
        request.userId,
        request.params.id,
        request.params.widgetId,
        request.body,
      ),
  )

  app.delete(
    API_ROUTES.dashboards.widget.pattern,
    { schema: { params: widgetParamsSchema } },
    async (request, reply) => {
      await core.dashboards.removeWidget(request.userId, request.params.id, request.params.widgetId)
      return reply.status(NO_CONTENT).send()
    },
  )
}

export const schedulingRoutes: RouteModule = (app, { core }) => {
  app.get(
    API_ROUTES.scheduledQueries.collection.pattern,
    { schema: { response: { 200: scheduledQueryListSchema } } },
    async (request) => ({ items: await core.scheduledQueries.list(request.userId) }),
  )

  app.post(
    API_ROUTES.scheduledQueries.collection.pattern,
    {
      schema: {
        body: upsertScheduledQueryRequestSchema,
        response: { [CREATED]: scheduledQuerySchema },
      },
    },
    async (request, reply) =>
      reply.status(CREATED).send(await core.scheduledQueries.create(request.userId, request.body)),
  )

  app.get(
    API_ROUTES.scheduledQueries.item.pattern,
    { schema: { params: idParamsSchema, response: { 200: scheduledQuerySchema } } },
    (request) => core.scheduledQueries.get(request.userId, request.params.id),
  )

  app.put(
    API_ROUTES.scheduledQueries.item.pattern,
    {
      schema: {
        params: idParamsSchema,
        body: upsertScheduledQueryRequestSchema,
        response: { 200: scheduledQuerySchema },
      },
    },
    (request) => core.scheduledQueries.update(request.userId, request.params.id, request.body),
  )

  app.delete(
    API_ROUTES.scheduledQueries.item.pattern,
    { schema: { params: idParamsSchema } },
    async (request, reply) => {
      await core.scheduledQueries.remove(request.userId, request.params.id)
      return reply.status(NO_CONTENT).send()
    },
  )

  app.post(
    API_ROUTES.scheduledQueries.run.pattern,
    { schema: { params: idParamsSchema, response: { [ACCEPTED]: runTriggeredSchema } } },
    async (request, reply) =>
      reply
        .status(ACCEPTED)
        .send({ jobId: await core.scheduledQueries.trigger(request.userId, request.params.id) }),
  )

  app.get(
    API_ROUTES.scheduledQueries.runs.pattern,
    { schema: { params: idParamsSchema, response: { 200: scheduledRunListSchema } } },
    async (request) => ({
      items: await core.scheduledQueries.runs(request.userId, request.params.id),
    }),
  )
}

export const qualityRoutes: RouteModule = (app, { core }) => {
  app.get(
    API_ROUTES.qualityChecks.collection.pattern,
    { schema: { response: { 200: qualityCheckListSchema } } },
    async (request) => ({
      items: await core.quality.list(request.userId),
    }),
  )

  app.get(
    API_ROUTES.qualityChecks.overview.pattern,
    { schema: { response: { 200: qualityOverviewSchema } } },
    (request) => core.quality.overview(request.userId),
  )

  app.post(
    API_ROUTES.qualityChecks.collection.pattern,
    {
      schema: {
        body: upsertQualityCheckRequestSchema,
        response: { [CREATED]: qualityCheckSchema },
      },
    },
    async (request, reply) =>
      reply.status(CREATED).send(await core.quality.create(request.userId, request.body)),
  )

  app.get(
    API_ROUTES.qualityChecks.item.pattern,
    { schema: { params: idParamsSchema, response: { 200: qualityCheckSchema } } },
    (request) => core.quality.get(request.userId, request.params.id),
  )

  app.put(
    API_ROUTES.qualityChecks.item.pattern,
    {
      schema: {
        params: idParamsSchema,
        body: upsertQualityCheckRequestSchema,
        response: { 200: qualityCheckSchema },
      },
    },
    (request) => core.quality.update(request.userId, request.params.id, request.body),
  )

  app.delete(
    API_ROUTES.qualityChecks.item.pattern,
    { schema: { params: idParamsSchema } },
    async (request, reply) => {
      await core.quality.remove(request.userId, request.params.id)
      return reply.status(NO_CONTENT).send()
    },
  )

  app.post(
    API_ROUTES.qualityChecks.run.pattern,
    { schema: { params: idParamsSchema, response: { [ACCEPTED]: runTriggeredSchema } } },
    async (request, reply) =>
      reply
        .status(ACCEPTED)
        .send({ jobId: await core.quality.trigger(request.userId, request.params.id) }),
  )

  app.get(
    API_ROUTES.qualityChecks.runs.pattern,
    { schema: { params: idParamsSchema, response: { 200: qualityRunListSchema } } },
    async (request) => ({ items: await core.quality.runs(request.userId, request.params.id) }),
  )
}
