import pg from "pg"
import { PG_TYPE_OIDS } from "./constants"

const NUMBER_TYPES = new Set<number>([
  PG_TYPE_OIDS.int2,
  PG_TYPE_OIDS.int4,
  PG_TYPE_OIDS.oid,
  PG_TYPE_OIDS.float4,
  PG_TYPE_OIDS.float8,
])

const identity = (value: string) => value

export const sandboxTypes: pg.CustomTypesConfig = {
  getTypeParser: ((oid: number) => {
    if (oid === PG_TYPE_OIDS.bool) {
      return (value: string) => value === "t"
    }
    if (NUMBER_TYPES.has(oid)) {
      return (value: string) => Number(value)
    }
    return identity
  }) as pg.CustomTypesConfig["getTypeParser"],
}

export type SandboxRole = "admin" | "reader" | "writer"

export type SandboxPoolOptions = {
  adminUrl: string
  readerUrl: string
  writerUrl: string
  poolSize: number
  applicationName: string
}

export class SandboxPools {
  readonly admin: pg.Pool
  readonly reader: pg.Pool
  readonly writer: pg.Pool

  constructor(options: SandboxPoolOptions) {
    const base = { max: options.poolSize, types: sandboxTypes }
    this.admin = new pg.Pool({
      ...base,
      connectionString: options.adminUrl,
      application_name: `${options.applicationName}-admin`,
    })
    this.reader = new pg.Pool({
      ...base,
      connectionString: options.readerUrl,
      application_name: `${options.applicationName}-reader`,
    })
    this.writer = new pg.Pool({
      ...base,
      connectionString: options.writerUrl,
      application_name: `${options.applicationName}-writer`,
    })
  }

  pool(role: SandboxRole): pg.Pool {
    return this[role]
  }

  async close() {
    await Promise.all([this.admin.end(), this.reader.end(), this.writer.end()])
  }
}
