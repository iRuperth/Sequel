import { readdir, readFile } from "node:fs/promises"
import { parse as parseYaml } from "yaml"
import type { z } from "zod"

export class DatasetAssetError extends Error {
  constructor(
    readonly path: string,
    message: string,
  ) {
    super(`${path}: ${message}`)
    this.name = "DatasetAssetError"
  }
}

function describeIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.map(String).join(".") || "(root)"} ${issue.message}`)
    .join("; ")
}

export function validateAsset<TSchema extends z.ZodType>(
  path: string,
  schema: TSchema,
  value: unknown,
): z.output<TSchema> {
  const result = schema.safeParse(value)
  if (!result.success) {
    throw new DatasetAssetError(path, describeIssues(result.error))
  }
  return result.data
}

export async function readTextAsset(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8")
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new DatasetAssetError(path, `cannot be read (${reason})`)
  }
}

export async function readYamlAsset<TSchema extends z.ZodType>(
  path: string,
  schema: TSchema,
): Promise<z.output<TSchema>> {
  const text = await readTextAsset(path)
  let parsed: unknown
  try {
    parsed = parseYaml(text)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new DatasetAssetError(path, `is not valid YAML (${reason})`)
  }
  return validateAsset(path, schema, parsed)
}

export async function readJsonAsset<TSchema extends z.ZodType>(
  path: string,
  schema: TSchema,
): Promise<z.output<TSchema>> {
  const text = await readTextAsset(path)
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new DatasetAssetError(path, `is not valid JSON (${reason})`)
  }
  return validateAsset(path, schema, parsed)
}

export async function listFiles(directory: string, extension: string): Promise<string[]> {
  try {
    const entries = await readdir(directory, { withFileTypes: true })
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
      .map((entry) => entry.name)
      .sort()
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new DatasetAssetError(directory, `cannot be listed (${reason})`)
  }
}
