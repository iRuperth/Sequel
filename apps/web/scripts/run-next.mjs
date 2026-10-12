import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join, resolve } from "node:path"

const WORKSPACE_MARKER = "pnpm-workspace.yaml"
const ENV_FILE_NAME = ".env"
const PORT_VARIABLE = "WEB_PORT"
const SIGNALS = ["SIGINT", "SIGTERM"]
const COMMANDS = new Set(["dev", "start"])

function findWorkspaceRoot(start) {
  let current = resolve(start)
  while (!existsSync(join(current, WORKSPACE_MARKER))) {
    const parent = dirname(current)
    if (parent === current) {
      return null
    }
    current = parent
  }
  return current
}

const command = process.argv[2]
if (!COMMANDS.has(command)) {
  process.stderr.write(
    `Unknown command "${command}". Expected one of: ${[...COMMANDS].join(", ")}\n`,
  )
  process.exit(1)
}

const root = findWorkspaceRoot(process.cwd())
const envFile = root ? join(root, ENV_FILE_NAME) : null
if (envFile && existsSync(envFile)) {
  process.loadEnvFile(envFile)
}

const port = process.env[PORT_VARIABLE]
if (!port) {
  process.stderr.write(
    `${PORT_VARIABLE} is not set. Create ${ENV_FILE_NAME} from .env.example or export it.\n`,
  )
  process.exit(1)
}

const nextBin = createRequire(import.meta.url).resolve("next/dist/bin/next")
const child = spawn(
  process.execPath,
  [nextBin, command, "--port", port, ...process.argv.slice(3)],
  {
    stdio: "inherit",
    env: process.env,
  },
)

for (const signal of SIGNALS) {
  process.on(signal, () => child.kill(signal))
}
child.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)))
