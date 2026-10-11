import { join } from "node:path"
import type { CliConfig } from "@sequel/config"
import { IdentityService, packageDir } from "@sequel/core"
import { createDatabase, runMigrations } from "@sequel/db"
import type { Logger } from "../logger"

const MIGRATIONS_DIRECTORY = "migrations"

export async function migrate(config: CliConfig, logger: Logger) {
  const database = createDatabase({ url: config.database.url, applicationName: "sequel-cli" })
  try {
    await runMigrations(database.db, join(packageDir("@sequel/db"), MIGRATIONS_DIRECTORY))
    logger.info("application database migrated")
    await new IdentityService(database.db, config.localUser).ensureLocalUser()
    logger.info({ user: config.localUser.handle }, "local workspace user ready")
  } finally {
    await database.close()
  }
}
