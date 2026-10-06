import { existsSync } from "node:fs"
import { dirname, join, resolve } from "node:path"

const WORKSPACE_MARKER = "pnpm-workspace.yaml"
const ENV_FILE_NAME = ".env"

export function findWorkspaceRoot(start: string = process.cwd()): string | undefined {
  let current = resolve(start)
  while (true) {
    if (existsSync(join(current, WORKSPACE_MARKER))) {
      return current
    }
    const parent = dirname(current)
    if (parent === current) {
      return undefined
    }
    current = parent
  }
}

export function loadWorkspaceEnv(start?: string): void {
  const root = findWorkspaceRoot(start)
  if (!root) {
    return
  }
  const envPath = join(root, ENV_FILE_NAME)
  if (existsSync(envPath)) {
    process.loadEnvFile(envPath)
  }
}
