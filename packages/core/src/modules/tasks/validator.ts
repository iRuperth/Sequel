import type { ExpectedColumn, TaskDefinition } from "@sequel/contracts"
import { interpolate, validationProblems } from "@sequel/copy"
import type { ReferenceSignature } from "@sequel/db"
import { resultDigest, type ExecutionOutcome, type SqlEngine } from "@sequel/sql-engine"
import type { SandboxService } from "../sandbox/service"
import type { WarehouseService } from "../warehouse/service"

export type ValidatorSettings = {
  referenceMaxRows: number
  referenceStoreRows: number
  numericScale: number
  statementTimeoutMs: number
}

export type ValidationResult =
  | { ok: true; signature: ReferenceSignature; expectedColumns: ExpectedColumn[] }
  | { ok: false; problem: string }

export type ReferenceRun = { outcome: ExecutionOutcome; sql: string }

export class ReferenceRunner {
  constructor(
    private readonly engine: SqlEngine,
    private readonly warehouse: WarehouseService,
    private readonly sandbox: SandboxService,
    private readonly statementTimeoutMs: number,
  ) {}

  async run(
    definition: Pick<TaskDefinition, "mode" | "verificationSql">,
    sql: string,
    maxRows: number,
  ): Promise<ExecutionOutcome> {
    if (definition.mode === "read") {
      return this.engine.runner.execute({
        sql,
        mode: "grade",
        searchPath: await this.warehouse.searchPath(null),
        ownedSchemas: [],
        maxRows,
        statementTimeoutMs: this.statementTimeoutMs,
      })
    }
    const schema = await this.sandbox.createGradeSchema()
    try {
      return await this.engine.runner.execute({
        sql,
        mode: "scratch",
        searchPath: await this.warehouse.searchPath(schema),
        ownedSchemas: [schema],
        maxRows,
        statementTimeoutMs: this.statementTimeoutMs,
        commit: false,
        followUpSql: definition.verificationSql ?? undefined,
      })
    } finally {
      await this.sandbox.dropGradeSchema(schema)
    }
  }
}

export class ReferenceValidator {
  constructor(
    private readonly runner: ReferenceRunner,
    private readonly settings: ValidatorSettings,
  ) {}

  async validate(definition: TaskDefinition): Promise<ValidationResult> {
    if (definition.mode === "scratch" && !definition.verificationSql?.trim()) {
      return { ok: false, problem: validationProblems.missingVerification }
    }
    if (definition.hints.filter((hint) => hint.trim()).length === 0) {
      return { ok: false, problem: validationProblems.missingHints }
    }
    const maxRows = this.settings.referenceMaxRows + 1
    const first = await this.runner.run(definition, definition.referenceSql, maxRows)
    const problem = this.problemFor(first, definition.expectedColumns.length)
    if (problem) {
      return { ok: false, problem }
    }
    const second = await this.runner.run(definition, definition.referenceSql, maxRows)
    const firstResult = first.result!
    const secondResult = second.result
    const digest = resultDigest(firstResult, definition.orderMatters, this.settings.numericScale)
    if (
      second.status !== "succeeded" ||
      !secondResult ||
      resultDigest(secondResult, definition.orderMatters, this.settings.numericScale) !== digest
    ) {
      return { ok: false, problem: validationProblems.nonDeterministic }
    }
    const expectedColumns = firstResult.columns.map((column, index) => ({
      name: column.name,
      typeHint: definition.expectedColumns[index]?.typeHint ?? "text",
    }))
    return {
      ok: true,
      expectedColumns,
      signature: {
        columns: firstResult.columns.map((column) => column.name),
        columnTypes: firstResult.columns.map((column) => column.dataType),
        rowCount: firstResult.rowCount,
        digest,
        rows: firstResult.rows.slice(0, this.settings.referenceStoreRows),
      },
    }
  }

  private problemFor(outcome: ExecutionOutcome, expectedColumnCount: number): string | null {
    if (outcome.status === "rejected") {
      return interpolate(validationProblems.rejected, {
        message: `${outcome.error?.rejectionReason ?? ""} ${outcome.error?.detail ?? ""}`.trim(),
      })
    }
    if (outcome.status !== "succeeded" || !outcome.result) {
      return interpolate(validationProblems.executionFailed, {
        message: outcome.error?.message ?? outcome.status,
      })
    }
    const result = outcome.result
    if (result.rowCount === 0) {
      return validationProblems.emptyResult
    }
    if (result.truncated || result.rowCount > this.settings.referenceMaxRows) {
      return interpolate(validationProblems.tooManyRows, { max: this.settings.referenceMaxRows })
    }
    if (result.columns.length !== expectedColumnCount) {
      return interpolate(validationProblems.columnMismatch, {
        actual: result.columns.length,
        expected: expectedColumnCount,
      })
    }
    return null
  }
}
