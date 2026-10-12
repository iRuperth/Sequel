import {
  DIFFICULTIES,
  DIFFICULTY_BANDS,
  type Difficulty,
  SKILL_MODEL,
  TOPIC_PREREQUISITES,
  TRACK_FOCUS,
  type Topic,
  type TopicSkill,
  type Track,
} from "@sequel/contracts"
import { copy, topicLabels } from "@sequel/copy"

const FALLBACK_DIFFICULTY: Difficulty = DIFFICULTIES[DIFFICULTIES.length - 1] ?? "expert"

export function difficultyBandForLevel(level: number): Difficulty {
  return DIFFICULTY_BANDS.find((band) => level <= band.maxLevel)?.difficulty ?? FALLBACK_DIFFICULTY
}

export function skillPassRate(skill: Pick<TopicSkill, "attempts" | "passes">): number | null {
  return skill.attempts > 0 ? skill.passes / skill.attempts : null
}

export function prerequisitesOf(topic: Topic): readonly Topic[] {
  return TOPIC_PREREQUISITES[topic]
}

export function missingPrerequisites(topic: Topic, skills: readonly TopicSkill[]): Topic[] {
  const levels = new Map(skills.map((skill) => [skill.topic, skill.level]))
  const missing = TOPIC_PREREQUISITES[topic].filter(
    (prerequisite) => (levels.get(prerequisite) ?? 0) < SKILL_MODEL.prerequisiteThreshold,
  )
  return missing.length > 0 ? missing : [...TOPIC_PREREQUISITES[topic]]
}

export function topicList(topics: readonly Topic[]): string {
  return topics.map((topic) => topicLabels[topic]).join(copy.progress.skills.listSeparator)
}

export function isFocusTopic(topic: Topic, track: Track | null | undefined): boolean {
  return track ? TRACK_FOCUS[track].includes(topic) : false
}

export function strongestUnlocked(skills: readonly TopicSkill[], limit: number): TopicSkill[] {
  return skills
    .filter((skill) => skill.unlocked)
    .sort((left, right) => right.level - left.level || right.attempts - left.attempts)
    .slice(0, limit)
}
