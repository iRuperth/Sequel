import { z } from "zod"

export const port = z.coerce.number().int().min(1).max(65535)
export const positiveInt = z.coerce.number().int().positive()
export const nonNegativeInt = z.coerce.number().int().nonnegative()
export const url = z.string().url()
export const nonEmpty = z.string().trim().min(1)
export const booleanFlag = z
  .enum(["true", "false", "1", "0", "yes", "no"])
  .transform((value) => value === "true" || value === "1" || value === "yes")
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
