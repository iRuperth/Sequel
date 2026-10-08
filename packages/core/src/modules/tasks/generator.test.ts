import type { TaskDefinition } from "@sequel/contracts"
import { describe, expect, it } from "vitest"
import { normaliseDefinition } from "./generator"

const definition: TaskDefinition = {
  title: "Weekly settled volume",
  track: "data_scientist",
  difficulty: "expert",
  topics: ["aggregation", "date_time"],
  datasetSlugs: ["ecommerce"],
  mode: "scratch",
  stakeholder: { name: "Priya Shah", role: "Head of Payments", team: "Payments" },
  businessContext: "Context",
  requirements: ["Requirement"],
  acceptanceCriteria: ["Criterion"],
  expectedColumns: [{ name: "week", typeHint: "date" }],
  orderMatters: true,
  referenceSql: "SELECT 1",
  verificationSql: "SELECT 1",
  hints: [" first ", "", "second", "third", "fourth"],
  explanation: "Explanation",
  estimatedMinutes: 12.6,
}

describe("normaliseDefinition", () => {
  it("forces the requested target and cleans hints", () => {
    const result = normaliseDefinition(definition, {
      track: "data_analyst",
      difficulty: "beginner",
      topics: ["filtering"],
      datasetSlug: "fintech",
      mode: "read",
    })
    expect(result.track).toBe("data_analyst")
    expect(result.difficulty).toBe("beginner")
    expect(result.mode).toBe("read")
    expect(result.verificationSql).toBeNull()
    expect(result.topics).toEqual(["filtering", "aggregation", "date_time"])
    expect(result.datasetSlugs).toEqual(["fintech", "ecommerce"])
    expect(result.hints).toEqual(["first", "second", "third"])
    expect(result.estimatedMinutes).toBe(13)
  })
})
