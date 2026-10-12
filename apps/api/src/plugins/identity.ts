import type { Core } from "@sequel/core"
import type { AppInstance } from "../lib/types"

declare module "fastify" {
  interface FastifyRequest {
    userId: string
  }
}

export function registerIdentity(app: AppInstance, core: Core) {
  app.decorateRequest("userId", "")
  app.addHook("onRequest", async (request) => {
    request.userId = core.identity.currentUserId
  })
}
