import { jobStageLabels } from "@sequel/copy"

function isStageKey(stage: string): stage is keyof typeof jobStageLabels {
  return Object.hasOwn(jobStageLabels, stage)
}

export function stageLabel(stage: string | null): string | null {
  if (!stage) {
    return null
  }
  return isStageKey(stage) ? jobStageLabels[stage] : stage
}
