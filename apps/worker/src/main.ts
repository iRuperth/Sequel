import { loadWorkerConfig } from "@sequel/config"
import { createCore, packageDir, starterMockResponder, type StarterExercise } from "@sequel/core"
import { loadStarterExercises } from "@sequel/datasets"
import pino from "pino"
import { WorkerRuntime } from "./runtime"

const SHUTDOWN_SIGNALS = ["SIGINT", "SIGTERM"] as const

async function main() {
  const config = loadWorkerConfig()
  const logger = pino({ level: config.log.level, base: { service: "sequel-worker" } })
  const datasetsRoot = config.datasets.root ?? packageDir("@sequel/datasets")
  let exercises: Promise<StarterExercise[]> | null = null
  const core = createCore(config, logger, {
    applicationName: "sequel-worker",
    mockResponder: starterMockResponder(() => (exercises ??= loadStarterExercises(datasetsRoot))),
  })
  await core.ready()
  const runtime = new WorkerRuntime(core, config, logger)
  await runtime.start()

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "shutting down")
    await runtime.stop()
    await core.close()
    process.exit(0)
  }
  for (const signal of SHUTDOWN_SIGNALS) {
    process.once(signal, () => void shutdown(signal))
  }
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  )
  process.exit(1)
})
