import { z } from "zod"
import { serviceNameSchema, serviceStateSchema } from "./enums"

export const serviceStatusSchema = z.object({
  name: serviceNameSchema,
  state: serviceStateSchema,
  latencyMs: z.number().nullable(),
  detail: z.string().nullable(),
})
export type ServiceStatus = z.infer<typeof serviceStatusSchema>

export const livenessSchema = z.object({ status: z.literal("ok") })

export const platformStatusSchema = z.object({
  name: z.string(),
  version: z.string(),
  environment: z.string(),
  uptimeSeconds: z.number(),
  checkedAt: z.string(),
  services: z.array(serviceStatusSchema),
})
export type PlatformStatus = z.infer<typeof platformStatusSchema>
