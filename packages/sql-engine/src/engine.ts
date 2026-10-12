import { classify, type Classification, type ClassifyOptions } from "./classify"
import { introspectSchemas } from "./introspect"
import { LibpgQueryParser, type SqlParser } from "./parser"
import { SandboxPools, type SandboxPoolOptions } from "./pools"
import { SqlRunner, type RunnerSettings } from "./runner"
import { ScratchManager } from "./scratch"
import { TypeNameRegistry } from "./type-names"

export type SqlEngineOptions = SandboxPoolOptions & RunnerSettings

function roleFromUrl(url: string): string {
  return decodeURIComponent(new URL(url).username)
}

export class SqlEngine {
  readonly parser: SqlParser
  readonly pools: SandboxPools
  readonly runner: SqlRunner
  readonly scratch: ScratchManager
  readonly typeNames: TypeNameRegistry

  constructor(options: SqlEngineOptions) {
    this.parser = new LibpgQueryParser()
    this.pools = new SandboxPools(options)
    this.typeNames = new TypeNameRegistry(this.pools.admin)
    this.runner = new SqlRunner(this.parser, this.pools, this.typeNames, options)
    this.scratch = new ScratchManager(this.pools.admin, {
      reader: roleFromUrl(options.readerUrl),
      writer: roleFromUrl(options.writerUrl),
    })
  }

  async ready(): Promise<void> {
    await this.parser.ready()
  }

  classify(sql: string, options: ClassifyOptions): Classification {
    return classify(this.parser, sql, options)
  }

  introspect(schemas: readonly string[]) {
    return introspectSchemas(this.pools.admin, schemas)
  }

  async ping(): Promise<void> {
    await this.pools.admin.query("SELECT 1")
  }

  async databaseName(): Promise<string> {
    const result = await this.pools.admin.query<{ name: string }>(
      "SELECT current_database() AS name",
    )
    return result.rows[0]?.name ?? ""
  }

  close() {
    return this.pools.close()
  }
}
