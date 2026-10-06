import { z } from "zod"
import { llmProviderNameSchema, trackSchema } from "./enums"
import { LIMITS } from "./limits"

export const preferencesSchema = z.object({
  editorFontSize: z.number().int().min(LIMITS.editorFontSizeMin).max(LIMITS.editorFontSizeMax),
  editorTabSize: z.number().int().min(LIMITS.editorTabSizeMin).max(LIMITS.editorTabSizeMax),
  editorWordWrap: z.boolean(),
  editorLineNumbers: z.boolean(),
  editorAutocomplete: z.boolean(),
  resultPageSize: z
    .number()
    .int()
    .min(1)
    .max(LIMITS.pageSizeMax * 5),
  defaultTrack: trackSchema,
  llmFeedbackEnabled: z.boolean(),
})
export type Preferences = z.infer<typeof preferencesSchema>

export const updatePreferencesRequestSchema = preferencesSchema.partial()
export type UpdatePreferencesRequest = z.infer<typeof updatePreferencesRequestSchema>

export const llmStatusSchema = z.object({
  provider: llmProviderNameSchema,
  model: z.string(),
  configured: z.boolean(),
  feedbackEnabled: z.boolean(),
})
export type LlmStatus = z.infer<typeof llmStatusSchema>

export const userProfileSchema = z.object({
  id: z.string(),
  handle: z.string(),
  displayName: z.string(),
  roleTitle: z.string(),
})
export type UserProfile = z.infer<typeof userProfileSchema>
