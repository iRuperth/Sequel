import { loadCliConfig } from "@sequel/config"
import { bootstrap } from "./commands/bootstrap"
import { migrate } from "./commands/migrate"
import { seed } from "./commands/seed"
import { createLogger } from "./logger"

const FORCE_FLAG = "--force"
const COMMANDS = ["bootstrap", "migrate", "seed", "setup"] as const
type Command = (typeof COMMANDS)[number]

function isCommand(value: string | undefined): value is Command {
  return COMMANDS.includes(value as Command)
}

async function main() {
  const [command, ...flags] = process.argv.slice(2)
  const config = loadCliConfig()
  const logger = createLogger(config.log.level)
  if (!isCommand(command)) {
    logger.error({ command, available: COMMANDS }, "unknown command")
    process.exitCode = 1
    return
  }
  const force = flags.includes(FORCE_FLAG)
  const handlers: Record<Command, () => Promise<void>> = {
    bootstrap: () => bootstrap(config, logger),
    migrate: () => migrate(config, logger),
    seed: () => seed(config, logger, { force }),
    setup: async () => {
      await bootstrap(config, logger)
      await migrate(config, logger)
      await seed(config, logger, { force })
    },
  }
  await handlers[command]()
  logger.info({ command }, "command completed")
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  )
  process.exit(1)
})
