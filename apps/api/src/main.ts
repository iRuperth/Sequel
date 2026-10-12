import { loadApiConfig } from "@sequel/config"
import {
  createCore,
  createJobEventHub,
  packageDir,
  starterMockResponder,
  type StarterExercise,
} from "@sequel/core"
import { loadStarterExercises } from "@sequel/datasets"
import pino from "pino"
import { buildServer } from "./server"

const SHUTDOWN_SIGNALS = ["SIGINT", "SIGTERM"] as const

async function main() {
  const config = loadApiConfig()
  const logger = pino({ level: config.log.level, base: { service: "sequel-api" } })
  const datasetsRoot = config.datasets.root ?? packageDir("@sequel/datasets")
  let exercises: Promise<StarterExercise[]> | null = null
  const core = createCore(config, logger, {
    applicationName: "sequel-api",
    mockResponder: starterMockResponder(() => (exercises ??= loadStarterExercises(datasetsRoot))),
  })
  await core.ready()
  await core.identity.ensureLocalUser()
  const hub = createJobEventHub(config.redis.url)
  await hub.start()

  const app = await buildServer({ core, hub, config }, logger)
  await app.listen({ host: config.api.host, port: config.api.port })

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "shutting down")
    await app.close()
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
