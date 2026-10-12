export type LogFn = {
  (message: string): void
  (context: Record<string, unknown>, message?: string): void
}

export interface Logger {
  debug: LogFn
  info: LogFn
  warn: LogFn
  error: LogFn
  child(bindings: Record<string, unknown>): Logger
}
