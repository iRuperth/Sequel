import type { CliConfig } from "@sequel/config"
import pg from "pg"
import type { Logger } from "../logger"

type RoleSpec = { name: string; password: string }

async function withClient<T>(url: string, run: (client: pg.Client) => Promise<T>): Promise<T> {
  const client = new pg.Client({ connectionString: url, application_name: "sequel-bootstrap" })
  await client.connect()
  try {
    return await run(client)
  } finally {
    await client.end()
  }
}

async function formatSql(client: pg.Client, template: string, ...args: string[]): Promise<string> {
  const placeholders = args.map((_value, index) => `$${index + 1}::text`).join(", ")
  const result = await client.query<{ statement: string }>(
    `SELECT format($${args.length + 1}::text, ${placeholders}) AS statement`,
    [...args, template],
  )
  const statement = result.rows[0]?.statement
  if (!statement) {
    throw new Error("Failed to format bootstrap statement")
  }
  return statement
}

async function execFormatted(client: pg.Client, template: string, ...args: string[]) {
  await client.query(await formatSql(client, template, ...args))
}

async function ensureRole(client: pg.Client, role: RoleSpec, connectionLimit: number | null) {
  const exists = await client.query("SELECT 1 FROM pg_roles WHERE rolname = $1", [role.name])
  const verb = exists.rowCount ? "ALTER" : "CREATE"
  await execFormatted(
    client,
    `${verb} ROLE %I WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD %L`,
    role.name,
    role.password,
  )
  if (connectionLimit !== null) {
    await execFormatted(client, `ALTER ROLE %I CONNECTION LIMIT ${connectionLimit}`, role.name)
  }
}

async function ensureDatabase(client: pg.Client, name: string, owner: string) {
  const exists = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [name])
  if (!exists.rowCount) {
    await execFormatted(client, "CREATE DATABASE %I OWNER %I", name, owner)
  } else {
    await execFormatted(client, "ALTER DATABASE %I OWNER TO %I", name, owner)
  }
  await execFormatted(client, "REVOKE ALL ON DATABASE %I FROM PUBLIC", name)
}

async function applySandboxRoleSettings(
  client: pg.Client,
  role: string,
  database: string,
  settings: Record<string, string>,
) {
  for (const [key, value] of Object.entries(settings)) {
    await execFormatted(
      client,
      `ALTER ROLE %I IN DATABASE %I SET ${key} = %L`,
      role,
      database,
      value,
    )
  }
}

export async function bootstrap(config: CliConfig, logger: Logger) {
  const { bootstrap: spec, sandbox } = config
  const { roles } = spec

  await withClient(spec.superuserUrl, async (client) => {
    await ensureRole(client, roles.app, null)
    await ensureRole(client, roles.sandboxAdmin, null)
    await ensureRole(client, roles.sandboxReader, sandbox.connectionLimit)
    await ensureRole(client, roles.sandboxWriter, sandbox.connectionLimit)
    logger.info("roles ready")

    await ensureDatabase(client, spec.appDatabase, roles.app.name)
    await ensureDatabase(client, spec.sandboxDatabase, roles.sandboxAdmin.name)
    await execFormatted(client, "GRANT ALL ON DATABASE %I TO %I", spec.appDatabase, roles.app.name)
    await execFormatted(
      client,
      "GRANT ALL ON DATABASE %I TO %I",
      spec.sandboxDatabase,
      roles.sandboxAdmin.name,
    )
    for (const role of [roles.sandboxReader, roles.sandboxWriter]) {
      await execFormatted(
        client,
        "GRANT CONNECT ON DATABASE %I TO %I",
        spec.sandboxDatabase,
        role.name,
      )
    }
    await execFormatted(client, "GRANT pg_signal_backend TO %I", roles.sandboxAdmin.name)
    await execFormatted(client, "GRANT pg_read_all_stats TO %I", roles.sandboxAdmin.name)
    await execFormatted(
      client,
      "GRANT %I TO %I WITH SET TRUE",
      roles.sandboxWriter.name,
      roles.sandboxAdmin.name,
    )
    logger.info("databases ready")

    const sharedSettings = {
      statement_timeout: String(sandbox.statementTimeoutMs),
      lock_timeout: String(sandbox.lockTimeoutMs),
      idle_in_transaction_session_timeout: String(sandbox.idleTransactionTimeoutMs),
      work_mem: sandbox.workMem,
      temp_file_limit: sandbox.tempFileLimit,
      timezone: sandbox.timezone,
    }
    await applySandboxRoleSettings(client, roles.sandboxReader.name, spec.sandboxDatabase, {
      ...sharedSettings,
      default_transaction_read_only: "on",
    })
    await applySandboxRoleSettings(client, roles.sandboxWriter.name, spec.sandboxDatabase, {
      ...sharedSettings,
      default_transaction_read_only: "off",
    })
    await applySandboxRoleSettings(client, roles.sandboxAdmin.name, spec.sandboxDatabase, {
      timezone: sandbox.timezone,
    })
    logger.info("sandbox role settings applied")
  })

  const sandboxUrl = new URL(spec.superuserUrl)
  sandboxUrl.pathname = `/${spec.sandboxDatabase}`
  await withClient(sandboxUrl.toString(), async (client) => {
    await client.query("REVOKE ALL ON SCHEMA public FROM PUBLIC")
    await execFormatted(client, "ALTER SCHEMA public OWNER TO %I", roles.sandboxAdmin.name)
    await execFormatted(
      client,
      "GRANT USAGE ON SCHEMA public TO %I, %I",
      roles.sandboxReader.name,
      roles.sandboxWriter.name,
    )
  })
  logger.info("sandbox schema privileges hardened")
}
