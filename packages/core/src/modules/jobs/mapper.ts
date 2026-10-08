import type { JobSnapshot } from "@sequel/contracts"
import type { jobs } from "@sequel/db"
import { iso, isoOrNull } from "../../shared/time"

export function toJobSnapshot(row: typeof jobs.$inferSelect): JobSnapshot {
  return {
    id: row.id,
    kind: row.kind,
    status: row.status,
    progress: row.progress,
    stage: row.stage,
    error: row.error,
    subjectId: row.subjectId,
    attempts: row.attempts,
    createdAt: iso(row.createdAt),
    startedAt: isoOrNull(row.startedAt),
    finishedAt: isoOrNull(row.finishedAt),
  }
}
