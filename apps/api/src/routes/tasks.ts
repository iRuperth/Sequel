import {
  API_ROUTES,
  generateTaskRequestSchema,
  generateTaskResponseSchema,
  hintParamsSchema,
  idParamsSchema,
  requestFeedbackResponseSchema,
  saveDraftRequestSchema,
  submissionListSchema,
  submissionParamsSchema,
  submitTaskRequestSchema,
  submitTaskResponseSchema,
  taskDetailSchema,
  taskHintSchema,
  taskListQuerySchema,
  taskPageSchema,
} from "@sequel/contracts"
import type { RouteModule } from "../lib/types"

const ACCEPTED = 202
const NO_CONTENT = 204

export const taskRoutes: RouteModule = (app, { core }) => {
  app.get(
    API_ROUTES.tasks.collection.pattern,
    { schema: { querystring: taskListQuerySchema, response: { 200: taskPageSchema } } },
    (request) => core.tasks.list(request.userId, request.query),
  )

  app.post(
    API_ROUTES.tasks.generate.pattern,
    {
      schema: {
        body: generateTaskRequestSchema,
        response: { [ACCEPTED]: generateTaskResponseSchema },
      },
    },
    async (request, reply) =>
      reply.status(ACCEPTED).send(await core.tasks.requestGeneration(request.userId, request.body)),
  )

  app.get(
    API_ROUTES.tasks.item.pattern,
    { schema: { params: idParamsSchema, response: { 200: taskDetailSchema } } },
    (request) => core.tasks.detail(request.userId, request.params.id),
  )

  app.put(
    API_ROUTES.tasks.draft.pattern,
    { schema: { params: idParamsSchema, body: saveDraftRequestSchema } },
    async (request, reply) => {
      await core.tasks.saveDraft(request.userId, request.params.id, request.body.sql)
      return reply.status(NO_CONTENT).send()
    },
  )

  app.post(
    API_ROUTES.tasks.retry.pattern,
    { schema: { params: idParamsSchema, response: { [ACCEPTED]: generateTaskResponseSchema } } },
    async (request, reply) =>
      reply.status(ACCEPTED).send(await core.tasks.retry(request.userId, request.params.id)),
  )

  app.post(
    API_ROUTES.tasks.revealHint.pattern,
    { schema: { params: hintParamsSchema, response: { 200: taskHintSchema } } },
    (request) => core.tasks.revealHint(request.userId, request.params.id, request.params.position),
  )

  app.post(
    API_ROUTES.tasks.abandon.pattern,
    { schema: { params: idParamsSchema, response: { 200: taskDetailSchema } } },
    (request) => core.tasks.abandon(request.userId, request.params.id),
  )

  app.get(
    API_ROUTES.tasks.submissions.pattern,
    { schema: { params: idParamsSchema, response: { 200: submissionListSchema } } },
    async (request) => ({ items: await core.tasks.submissions(request.userId, request.params.id) }),
  )

  app.post(
    API_ROUTES.tasks.submissions.pattern,
    {
      schema: {
        params: idParamsSchema,
        body: submitTaskRequestSchema,
        response: { [ACCEPTED]: submitTaskResponseSchema },
      },
    },
    async (request, reply) =>
      reply
        .status(ACCEPTED)
        .send(await core.tasks.submit(request.userId, request.params.id, request.body.sql)),
  )

  app.post(
    API_ROUTES.tasks.feedback.pattern,
    {
      schema: {
        params: submissionParamsSchema,
        response: { [ACCEPTED]: requestFeedbackResponseSchema },
      },
    },
    async (request, reply) =>
      reply
        .status(ACCEPTED)
        .send(
          await core.tasks.requestFeedback(
            request.userId,
            request.params.id,
            request.params.submissionId,
          ),
        ),
  )
}
