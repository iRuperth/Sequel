import type { Difficulty, Topic, Track } from "./enums"

export const TOPIC_PREREQUISITES: Record<Topic, readonly Topic[]> = {
  select_basics: [],
  filtering: ["select_basics"],
  sorting_limiting: ["select_basics"],
  aggregation: ["filtering"],
  joins: ["filtering"],
  null_handling: ["filtering"],
  conditional_logic: ["filtering"],
  string_functions: ["select_basics"],
  date_time: ["filtering"],
  subqueries: ["joins", "aggregation"],
  set_operations: ["joins"],
  ctes: ["subqueries"],
  window_functions: ["aggregation", "ctes"],
  dml: ["filtering"],
  data_modelling_ddl: ["joins"],
  data_quality: ["aggregation", "null_handling"],
  analytics_patterns: ["window_functions"],
  query_optimisation: ["joins", "aggregation"],
}

export const TRACK_FOCUS: Record<Track, readonly Topic[]> = {
  data_analyst: [
    "filtering",
    "aggregation",
    "joins",
    "date_time",
    "conditional_logic",
    "window_functions",
    "analytics_patterns",
  ],
  data_engineer: [
    "joins",
    "ctes",
    "dml",
    "data_modelling_ddl",
    "data_quality",
    "query_optimisation",
    "window_functions",
  ],
  data_scientist: [
    "aggregation",
    "window_functions",
    "analytics_patterns",
    "date_time",
    "subqueries",
    "null_handling",
    "ctes",
  ],
}

export const DIFFICULTY_BANDS: readonly { difficulty: Difficulty; maxLevel: number }[] = [
  { difficulty: "beginner", maxLevel: 30 },
  { difficulty: "intermediate", maxLevel: 55 },
  { difficulty: "advanced", maxLevel: 80 },
  { difficulty: "expert", maxLevel: 100 },
]

export const SKILL_MODEL = {
  initialLevel: 20,
  maxLevel: 100,
  prerequisiteThreshold: 35,
  gainByDifficulty: { beginner: 8, intermediate: 12, advanced: 16, expert: 20 },
  lossByDifficulty: { beginner: 6, intermediate: 5, advanced: 4, expert: 3 },
  focusTopicsPerTask: 2,
} as const
