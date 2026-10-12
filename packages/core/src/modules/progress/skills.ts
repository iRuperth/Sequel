import {
  DIFFICULTIES,
  DIFFICULTY_BANDS,
  SKILL_MODEL,
  TOPIC_PREREQUISITES,
  TOPICS,
  TRACK_FOCUS,
  type Difficulty,
  type Topic,
  type Track,
} from "@sequel/contracts"

export type SkillState = {
  level: number
  attempts: number
  passes: number
  lastPracticedAt: Date | null
}
export type SkillMap = Record<Topic, SkillState>

export function emptySkillMap(): SkillMap {
  return Object.fromEntries(
    TOPICS.map((topic) => [
      topic,
      { level: SKILL_MODEL.initialLevel, attempts: 0, passes: 0, lastPracticedAt: null },
    ]),
  ) as SkillMap
}

export function nextLevel(level: number, difficulty: Difficulty, passed: boolean): number {
  const max = SKILL_MODEL.maxLevel
  const next = passed
    ? level + SKILL_MODEL.gainByDifficulty[difficulty] * (1 - level / max)
    : level - SKILL_MODEL.lossByDifficulty[difficulty] * (level / max)
  return Math.round(Math.min(max, Math.max(0, next)) * 10) / 10
}

export function isUnlocked(topic: Topic, skills: SkillMap): boolean {
  return TOPIC_PREREQUISITES[topic].every(
    (prerequisite) => skills[prerequisite].level >= SKILL_MODEL.prerequisiteThreshold,
  )
}

export function difficultyForLevel(level: number): Difficulty {
  return (
    DIFFICULTY_BANDS.find((band) => level <= band.maxLevel)?.difficulty ??
    DIFFICULTIES[DIFFICULTIES.length - 1]!
  )
}

export function overallLevel(skills: SkillMap): number {
  const practiced = TOPICS.filter((topic) => skills[topic].attempts > 0)
  const pool: readonly Topic[] = practiced.length > 0 ? practiced : TOPICS
  const total = pool.reduce((sum, topic) => sum + skills[topic].level, 0)
  return Math.round((total / pool.length) * 10) / 10
}

export function chooseFocusTopics(track: Track, skills: SkillMap): Topic[] {
  const unlocked = TRACK_FOCUS[track].filter((topic) => isUnlocked(topic, skills))
  const candidates =
    unlocked.length > 0 ? unlocked : TOPICS.filter((topic) => isUnlocked(topic, skills))
  return [...candidates]
    .sort((left, right) => {
      const byLevel = skills[left].level - skills[right].level
      if (byLevel !== 0) {
        return byLevel
      }
      const leftAt = skills[left].lastPracticedAt?.getTime() ?? 0
      const rightAt = skills[right].lastPracticedAt?.getTime() ?? 0
      return leftAt - rightAt
    })
    .slice(0, SKILL_MODEL.focusTopicsPerTask)
}

export function recommendedTrack(skills: SkillMap, fallback: Track): Track {
  const scores = (Object.keys(TRACK_FOCUS) as Track[]).map((track) => ({
    track,
    score:
      TRACK_FOCUS[track].reduce((sum, topic) => sum + skills[topic].level, 0) /
      TRACK_FOCUS[track].length,
  }))
  const weakest = scores.sort((left, right) => left.score - right.score)[0]
  return weakest && weakest.score < SKILL_MODEL.prerequisiteThreshold
    ? fallback
    : (weakest?.track ?? fallback)
}
