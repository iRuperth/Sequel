import type { z } from "zod"
import { loadWorkspaceEnv } from "./env-file"

export class ConfigurationError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Invalid configuration:\n${issues.map((issue) => `  ${issue}`).join("\n")}`)
    this.name = "ConfigurationError"
  }
}

export function parseEnv<TSchema extends z.ZodType>(
  schema: TSchema,
  source: NodeJS.ProcessEnv = process.env,
): z.infer<TSchema> {
  loadWorkspaceEnv()
  const result = schema.safeParse(source)
  if (!result.success) {
    throw new ConfigurationError(
      result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
    )
  }
  return result.data
}
