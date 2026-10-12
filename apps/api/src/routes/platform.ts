import {
  API_ROUTES,
  livenessSchema,
  llmStatusSchema,
  platformStatusSchema,
  preferencesSchema,
  updatePreferencesRequestSchema,
  userProfileSchema,
} from "@sequel/contracts"
import type { RouteModule } from "../lib/types"

export const platformRoutes: RouteModule = (app, { core }) => {
  app.get(
    API_ROUTES.health.liveness.pattern,
    { schema: { response: { 200: livenessSchema } } },
    async () => ({
      status: "ok" as const,
    }),
  )

  app.get(
    API_ROUTES.health.services.pattern,
    { schema: { response: { 200: platformStatusSchema } } },
    () => core.health.status(),
  )

  app.get(API_ROUTES.me.pattern, { schema: { response: { 200: userProfileSchema } } }, (request) =>
    core.identity.profile(request.userId),
  )

  app.get(
    API_ROUTES.settings.preferences.pattern,
    { schema: { response: { 200: preferencesSchema } } },
    (request) => core.identity.preferences(request.userId),
  )

  app.put(
    API_ROUTES.settings.preferences.pattern,
    { schema: { body: updatePreferencesRequestSchema, response: { 200: preferencesSchema } } },
    (request) => core.identity.updatePreferences(request.userId, request.body),
  )

  app.get(API_ROUTES.settings.llm.pattern, { schema: { response: { 200: llmStatusSchema } } }, () =>
    core.health.llmStatus(),
  )
}
