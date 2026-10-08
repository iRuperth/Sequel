import { tables, type Database } from "@sequel/db"
import { sql } from "drizzle-orm"
import { utcDay } from "../../shared/time"

export type ActivityIncrement = {
  queriesRun?: number
  tasksAttempted?: number
  tasksSolved?: number
}

export class ActivityService {
  constructor(private readonly db: Database) {}

  async record(userId: string, increment: ActivityIncrement, at: Date = new Date()): Promise<void> {
    const values = {
      queriesRun: increment.queriesRun ?? 0,
      tasksAttempted: increment.tasksAttempted ?? 0,
      tasksSolved: increment.tasksSolved ?? 0,
    }
    await this.db
      .insert(tables.dailyActivity)
      .values({ userId, day: utcDay(at), ...values })
      .onConflictDoUpdate({
        target: [tables.dailyActivity.userId, tables.dailyActivity.day],
        set: {
          queriesRun: sql`${tables.dailyActivity.queriesRun} + ${values.queriesRun}`,
          tasksAttempted: sql`${tables.dailyActivity.tasksAttempted} + ${values.tasksAttempted}`,
          tasksSolved: sql`${tables.dailyActivity.tasksSolved} + ${values.tasksSolved}`,
        },
      })
  }
}
