import { z } from "zod"

const publicConfigSchema = z.object({
  apiBasePath: z.string().min(1),
  jobPollIntervalMs: z.coerce.number().int().positive(),
  appVersion: z.string().min(1),
})

export type PublicConfig = z.infer<typeof publicConfigSchema>

export const publicConfig: PublicConfig = publicConfigSchema.parse({
  apiBasePath: process.env.NEXT_PUBLIC_API_BASE_PATH,
  jobPollIntervalMs: process.env.NEXT_PUBLIC_JOB_POLL_INTERVAL_MS,
  appVersion: process.env.NEXT_PUBLIC_APP_VERSION,
})
