import {
  API_ROUTES,
  JOB_EVENT_NAMES,
  TERMINAL_JOB_STATUSES,
  jobListQuerySchema,
  jobListSchema,
  jobParamsSchema,
  jobSnapshotSchema,
  type JobSnapshot,
} from "@sequel/contracts"
import type { RouteModule } from "../lib/types"

const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
}

export const jobRoutes: RouteModule = (app, { core, hub, config }) => {
  app.get(
    API_ROUTES.jobs.collection.pattern,
    { schema: { querystring: jobListQuerySchema, response: { 200: jobListSchema } } },
    async (request) => ({ items: await core.jobs.list(request.query) }),
  )

  app.get(
    API_ROUTES.jobs.item.pattern,
    { schema: { params: jobParamsSchema, response: { 200: jobSnapshotSchema } } },
    (request) => core.jobs.get(request.params.id),
  )

  app.get(
    API_ROUTES.jobs.events.pattern,
    { schema: { params: jobParamsSchema } },
    async (request, reply) => {
      const initial = await core.jobs.get(request.params.id)
      reply.hijack()
      const raw = reply.raw
      raw.writeHead(200, SSE_HEADERS)

      let closed = false
      const write = (event: string, data: unknown) => {
        if (!closed) {
          raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        }
      }
      const finish = () => {
        if (closed) {
          return
        }
        closed = true
        clearInterval(heartbeat)
        unsubscribe()
        raw.end()
      }
      const onSnapshot = (snapshot: JobSnapshot) => {
        write(JOB_EVENT_NAMES.snapshot, snapshot)
        if (TERMINAL_JOB_STATUSES.includes(snapshot.status)) {
          finish()
        }
      }
      const unsubscribe = hub.subscribe(initial.id, onSnapshot)
      const heartbeat = setInterval(
        () => write(JOB_EVENT_NAMES.heartbeat, { at: new Date().toISOString() }),
        config.api.sseHeartbeatMs,
      )
      request.raw.on("close", finish)

      const latest = await core.jobs.get(initial.id)
      onSnapshot(latest)
    },
  )
}
