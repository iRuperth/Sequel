import type { ApiConfig } from "@sequel/config"
import type { Core, JobEventHub } from "@sequel/core"
import type {
  FastifyBaseLogger,
  FastifyInstance,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerDefault,
} from "fastify"
import type { ZodTypeProvider } from "fastify-type-provider-zod"

export type AppInstance = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  FastifyBaseLogger,
  ZodTypeProvider
>

export type RouteContext = {
  core: Core
  hub: JobEventHub
  config: ApiConfig
}

export type RouteModule = (app: AppInstance, context: RouteContext) => void
