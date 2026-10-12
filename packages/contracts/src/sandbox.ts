import { z } from "zod"
import { idSchema, timestampSchema } from "./common"
import { relationKindSchema, sandboxSessionStatusSchema } from "./enums"

export const sandboxObjectSchema = z.object({
  name: z.string(),
  kind: relationKindSchema,
  rowEstimate: z.number().int().nullable(),
})

export const sandboxSessionSchema = z.object({
  id: idSchema,
  schemaName: z.string(),
  status: sandboxSessionStatusSchema,
  createdAt: timestampSchema,
  lastUsedAt: timestampSchema,
  expiresAt: timestampSchema,
  objects: z.array(sandboxObjectSchema),
})
export type SandboxSession = z.infer<typeof sandboxSessionSchema>

export const sandboxSessionResponseSchema = z.object({ session: sandboxSessionSchema.nullable() })
export type SandboxSessionResponse = z.infer<typeof sandboxSessionResponseSchema>
