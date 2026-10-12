import { stat } from "node:fs/promises"
import { LIMITS, taskDefinitionSchema } from "@sequel/contracts"
import { z } from "zod"
import { listFiles, readJsonAsset } from "./files"
import { loadManifest } from "./manifest"
import { DATASET_ASSET_PATHS, assetPath } from "./paths"

export const STARTER_HINT_COUNT = 3

export const starterExerciseSchema = taskDefinitionSchema
  .extend({
    key: z.string().regex(/^[a-z][a-z0-9_]*-\d{3}$/, "must look like dataset-001"),
    order: z.number().int().positive(),
  })
  .superRefine((exercise, context) => {
    const issue = (path: (string | number)[], message: string) =>
      context.addIssue({ code: "custom", path, message })
    if (exercise.hints.length !== STARTER_HINT_COUNT) {
      issue(["hints"], `must contain exactly ${STARTER_HINT_COUNT} hints`)
    }
    if (exercise.mode === "read" && exercise.verificationSql !== null) {
      issue(["verificationSql"], "must be null for read mode tasks")
    }
    if (exercise.mode === "scratch" && (exercise.verificationSql ?? "").trim().length === 0) {
      issue(["verificationSql"], "is required for scratch mode tasks")
    }
    if (exercise.expectedColumns.length === 0) {
      issue(["expectedColumns"], "must list at least one column")
    }
    const names = exercise.expectedColumns.map((column) => column.name)
    if (new Set(names).size !== names.length) {
      issue(["expectedColumns"], "column names must be unique")
    }
    if (exercise.topics.length === 0 || exercise.topics.length > LIMITS.topicsPerTaskMax) {
      issue(["topics"], `must list between 1 and ${LIMITS.topicsPerTaskMax} topics`)
    }
    if (exercise.datasetSlugs.length === 0) {
      issue(["datasetSlugs"], "must reference at least one dataset")
    }
    if (exercise.requirements.length === 0 || exercise.acceptanceCriteria.length === 0) {
      issue(["requirements"], "requirements and acceptance criteria are required")
    }
    if (exercise.estimatedMinutes <= 0) {
      issue(["estimatedMinutes"], "must be positive")
    }
  })
export type StarterExercise = z.infer<typeof starterExerciseSchema>

async function directoryExists(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory()
  } catch {
    return false
  }
}

export async function loadStarterExercises(root: string): Promise<StarterExercise[]> {
  const manifest = await loadManifest(root)
  const keys = new Set<string>()
  const result: StarterExercise[] = []
  for (const entry of manifest) {
    const directory = assetPath(root, DATASET_ASSET_PATHS.exercises, entry.slug)
    if (!(await directoryExists(directory))) {
      continue
    }
    const files = await listFiles(directory, ".json")
    const exercises = await Promise.all(
      files.map((file) => readJsonAsset(assetPath(directory, file), starterExerciseSchema)),
    )
    const orders = new Set<number>()
    for (const exercise of exercises) {
      if (!exercise.key.startsWith(`${entry.slug}-`)) {
        throw new Error(`Exercise ${exercise.key} must be prefixed with ${entry.slug}-`)
      }
      if (!exercise.datasetSlugs.includes(entry.slug)) {
        throw new Error(`Exercise ${exercise.key} must list ${entry.slug} in datasetSlugs`)
      }
      if (keys.has(exercise.key)) {
        throw new Error(`Duplicate exercise key ${exercise.key}`)
      }
      if (orders.has(exercise.order)) {
        throw new Error(`Duplicate exercise order ${exercise.order} in ${entry.slug}`)
      }
      keys.add(exercise.key)
      orders.add(exercise.order)
    }
    result.push(...exercises.sort((left, right) => left.order - right.order))
  }
  return result
}
