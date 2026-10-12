import type { ExecutionMode } from "@sequel/contracts"

const READ_STATEMENTS = ["SelectStmt", "ExplainStmt", "VariableShowStmt"] as const

const SCRATCH_STATEMENTS = [
  ...READ_STATEMENTS,
  "InsertStmt",
  "UpdateStmt",
  "DeleteStmt",
  "MergeStmt",
  "CreateStmt",
  "CreateTableAsStmt",
  "ViewStmt",
  "IndexStmt",
  "AlterTableStmt",
  "DropStmt",
  "TruncateStmt",
  "RenameStmt",
  "CommentStmt",
  "CreateFunctionStmt",
  "RefreshMatViewStmt",
  "CreateSeqStmt",
  "AlterSeqStmt",
  "CreateEnumStmt",
  "CompositeTypeStmt",
  "CreateDomainStmt",
] as const

export const STATEMENT_ALLOWLIST: Record<ExecutionMode, ReadonlySet<string>> = {
  read: new Set(READ_STATEMENTS),
  grade: new Set(READ_STATEMENTS),
  explain: new Set(READ_STATEMENTS),
  scratch: new Set(SCRATCH_STATEMENTS),
}

export const ROW_RETURNING_STATEMENTS: ReadonlySet<string> = new Set(READ_STATEMENTS)

export const DENIED_FUNCTIONS: ReadonlySet<string> = new Set([
  "set_config",
  "pg_terminate_backend",
  "pg_cancel_backend",
  "pg_reload_conf",
  "pg_rotate_logfile",
  "pg_read_file",
  "pg_read_binary_file",
  "pg_ls_dir",
  "pg_stat_file",
  "lo_import",
  "lo_export",
  "lo_unlink",
  "pg_promote",
  "pg_switch_wal",
])

export const DENIED_FUNCTION_PREFIXES: readonly string[] = [
  "dblink",
  "pg_logical_",
  "pg_replication_",
  "pg_advisory_",
  "pg_try_advisory_",
  "pg_ls_",
  "pg_create_",
  "pg_drop_replication",
]

export const ALLOWED_FUNCTION_LANGUAGES: ReadonlySet<string> = new Set(["sql", "plpgsql"])

export function isDeniedFunction(name: string): boolean {
  return (
    DENIED_FUNCTIONS.has(name) || DENIED_FUNCTION_PREFIXES.some((prefix) => name.startsWith(prefix))
  )
}
