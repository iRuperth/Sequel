import cors from "@fastify/cors"
import swagger from "@fastify/swagger"
import swaggerUi from "@fastify/swagger-ui"
import Fastify, { type FastifyBaseLogger } from "fastify"
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod"
import { registerErrorHandling } from "./plugins/errors"
import { registerIdentity } from "./plugins/identity"
import { catalogRoutes } from "./routes/catalog"
import { jobRoutes } from "./routes/jobs"
import {
  dashboardRoutes,
  progressRoutes,
  qualityRoutes,
  schedulingRoutes,
} from "./routes/operations"
import { platformRoutes } from "./routes/platform"
import { queryRoutes } from "./routes/queries"
import { taskRoutes } from "./routes/tasks"
import { workspaceRoutes } from "./routes/workspace"
import type { AppInstance, RouteContext, RouteModule } from "./lib/types"

const ROUTE_MODULES: RouteModule[] = [
  platformRoutes,
  queryRoutes,
  workspaceRoutes,
  catalogRoutes,
  taskRoutes,
  jobRoutes,
  progressRoutes,
  dashboardRoutes,
  schedulingRoutes,
  qualityRoutes,
]

const DOCS_PATH = "/docs"

export async function buildServer(
  context: RouteContext,
  logger: FastifyBaseLogger,
): Promise<AppInstance> {
  const { config } = context
  const app = Fastify({
    loggerInstance: logger,
    bodyLimit: config.api.bodyLimitBytes,
    disableRequestLogging: false,
    requestIdHeader: "x-request-id",
  }).withTypeProvider<ZodTypeProvider>()

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)
  registerErrorHandling(app)
  registerIdentity(app, context.core)

  if (config.api.corsOrigins.length > 0) {
    await app.register(cors, { origin: config.api.corsOrigins, credentials: true })
  }

  await app.register(swagger, {
    openapi: {
      info: { title: `${config.app.name} API`, version: config.app.version },
      servers: [{ url: "/" }],
    },
    transform: jsonSchemaTransform,
  })
  await app.register(swaggerUi, { routePrefix: `${config.api.basePath}${DOCS_PATH}` })

  await app.register(
    async (scope) => {
      const typed = scope.withTypeProvider<ZodTypeProvider>()
      for (const register of ROUTE_MODULES) {
        register(typed, context)
      }
    },
    { prefix: config.api.basePath },
  )

  return app
}
