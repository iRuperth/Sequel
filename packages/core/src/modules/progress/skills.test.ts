import { SKILL_MODEL } from "@sequel/contracts"
import { describe, expect, it } from "vitest"
import {
  chooseFocusTopics,
  difficultyForLevel,
  emptySkillMap,
  isUnlocked,
  nextLevel,
} from "./skills"

describe("skill model", () => {
  it("raises levels with diminishing returns and lowers them on failure", () => {
    const low = nextLevel(20, "intermediate", true)
    const high = nextLevel(80, "intermediate", true)
    expect(low - 20).toBeGreaterThan(high - 80)
    expect(nextLevel(50, "beginner", false)).toBeLessThan(50)
    expect(nextLevel(SKILL_MODEL.maxLevel, "expert", true)).toBe(SKILL_MODEL.maxLevel)
  })

  it("maps levels to difficulty bands", () => {
    expect(difficultyForLevel(10)).toBe("beginner")
    expect(difficultyForLevel(50)).toBe("intermediate")
    expect(difficultyForLevel(70)).toBe("advanced")
    expect(difficultyForLevel(95)).toBe("expert")
  })

  it("locks topics until prerequisites reach the threshold", () => {
    const skills = emptySkillMap()
    expect(isUnlocked("select_basics", skills)).toBe(true)
    expect(isUnlocked("window_functions", skills)).toBe(false)
    skills.aggregation.level = SKILL_MODEL.prerequisiteThreshold
    skills.ctes.level = SKILL_MODEL.prerequisiteThreshold
    expect(isUnlocked("window_functions", skills)).toBe(true)
  })

  it("focuses on the weakest unlocked topics of the track", () => {
    const skills = emptySkillMap()
    for (const topic of Object.keys(skills) as (keyof typeof skills)[]) {
      skills[topic].level = 50
    }
    skills.date_time.level = 30
    skills.filtering.level = 40
    expect(chooseFocusTopics("data_analyst", skills)).toEqual(["date_time", "filtering"])
  })
})
