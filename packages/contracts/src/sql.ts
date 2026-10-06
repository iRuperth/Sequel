import { z } from "zod"
import { idSchema, rowSchema, timestampSchema } from "./common"
import {
  executionModeSchema,
  executionSourceSchema,
  executionStatusSchema,
  interactiveExecutionModeSchema,
  rejectionReasonSchema,
} from "./enums"
import { LIMITS } from "./limits"

export const sqlTextSchema = z.string().min(1).max(LIMITS.sqlMaxLength)

export const columnMetaSchema = z.object({
  name: z.string(),
  dataType: z.string(),
  dataTypeId: z.number().int(),
})
export type ColumnMeta = z.infer<typeof columnMetaSchema>

export const resultSetSchema = z.object({
  columns: z.array(columnMetaSchema),
  rows: z.array(rowSchema),
  rowCount: z.number().int(),
  truncated: z.boolean(),
  commandTag: z.string().nullable(),
  affectedRows: z.number().int().nullable(),
})
export type ResultSet = z.infer<typeof resultSetSchema>

export const sqlErrorSchema = z.object({
  message: z.string(),
  sqlState: z.string().nullable(),
  position: z.number().int().nullable(),
  detail: z.string().nullable(),
  hint: z.string().nullable(),
  statementIndex: z.number().int().nullable(),
  rejectionReason: rejectionReasonSchema.nullable(),
})
export type SqlError = z.infer<typeof sqlErrorSchema>

export const executionSummarySchema = z.object({
  id: idSchema,
  sqlText: z.string(),
  mode: executionModeSchema,
  status: executionStatusSchema,
  source: executionSourceSchema,
  durationMs: z.number().int(),
  rowCount: z.number().int().nullable(),
  truncated: z.boolean(),
  statementCount: z.number().int(),
  errorMessage: z.string().nullable(),
  rejectionReason: rejectionReasonSchema.nullable(),
  taskId: idSchema.nullable(),
  executedAt: timestampSchema,
})
export type ExecutionSummary = z.infer<typeof executionSummarySchema>

export const executeQueryRequestSchema = z.object({
  sql: sqlTextSchema,
  mode: interactiveExecutionModeSchema.default("read"),
  requestId: idSchema.optional(),
})
export type ExecuteQueryRequest = z.input<typeof executeQueryRequestSchema>

export const executeQueryResponseSchema = z.object({
  execution: executionSummarySchema,
  result: resultSetSchema.nullable(),
  error: sqlErrorSchema.nullable(),
})
export type ExecuteQueryResponse = z.infer<typeof executeQueryResponseSchema>

export const cancelQueryRequestSchema = z.object({ requestId: idSchema })
export const cancelQueryResponseSchema = z.object({ cancelled: z.boolean() })

export type PlanNode = {
  nodeType: string
  relationName: string | null
  schema: string | null
  alias: string | null
  indexName: string | null
  joinType: string | null
  strategy: string | null
  startupCost: number
  totalCost: number
  planRows: number
  planWidth: number
  actualStartupTime: number | null
  actualTotalTime: number | null
  actualRows: number | null
  actualLoops: number | null
  filter: string | null
  condition: string | null
  sortKey: string[] | null
  groupKey: string[] | null
  details: Record<string, string>
  children: PlanNode[]
}

export const planNodeSchema: z.ZodType<PlanNode> = z.lazy(() =>
  z.object({
    nodeType: z.string(),
    relationName: z.string().nullable(),
    schema: z.string().nullable(),
    alias: z.string().nullable(),
    indexName: z.string().nullable(),
    joinType: z.string().nullable(),
    strategy: z.string().nullable(),
    startupCost: z.number(),
    totalCost: z.number(),
    planRows: z.number(),
    planWidth: z.number(),
    actualStartupTime: z.number().nullable(),
    actualTotalTime: z.number().nullable(),
    actualRows: z.number().nullable(),
    actualLoops: z.number().nullable(),
    filter: z.string().nullable(),
    condition: z.string().nullable(),
    sortKey: z.array(z.string()).nullable(),
    groupKey: z.array(z.string()).nullable(),
    details: z.record(z.string(), z.string()),
    children: z.array(planNodeSchema),
  }),
)

export const explainRequestSchema = z.object({
  sql: sqlTextSchema,
  analyze: z.boolean().default(false),
})
export type ExplainRequest = z.input<typeof explainRequestSchema>

export const explainPlanSchema = z.object({
  root: planNodeSchema,
  planningTimeMs: z.number().nullable(),
  executionTimeMs: z.number().nullable(),
  analyzed: z.boolean(),
})
export type ExplainPlan = z.infer<typeof explainPlanSchema>

export const explainResponseSchema = z.object({
  execution: executionSummarySchema,
  plan: explainPlanSchema.nullable(),
  error: sqlErrorSchema.nullable(),
})
export type ExplainResponse = z.infer<typeof explainResponseSchema>

export const historyQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(LIMITS.pageSizeMax).optional(),
  status: executionStatusSchema.optional(),
  source: executionSourceSchema.optional(),
  search: z.string().max(LIMITS.searchMaxLength).optional(),
})
export type HistoryQuery = z.infer<typeof historyQuerySchema>

export const historyPageSchema = z.object({
  items: z.array(executionSummarySchema),
  nextCursor: z.string().nullable(),
})
export type HistoryPage = z.infer<typeof historyPageSchema>

export const executionDetailSchema = executionSummarySchema.extend({
  columns: z.array(columnMetaSchema).nullable(),
  errorDetail: z.string().nullable(),
  errorPosition: z.number().int().nullable(),
})
export type ExecutionDetail = z.infer<typeof executionDetailSchema>
