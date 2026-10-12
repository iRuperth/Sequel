import type { Difficulty, TaskDefinition, TaskMode, Topic, Track } from "@sequel/contracts"

export type StarterExercise = TaskDefinition & { key: string; order: number }

export type TaskTarget = {
  track: Track
  difficulty: Difficulty
  topics: Topic[]
  datasetSlug: string
  mode: TaskMode
}

export const SCRATCH_TOPICS: readonly Topic[] = ["data_modelling_ddl", "dml"]
