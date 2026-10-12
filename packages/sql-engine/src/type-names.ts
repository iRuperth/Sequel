import type pg from "pg"

export class TypeNameRegistry {
  private names = new Map<number, string>()
  private loading: Promise<void> | undefined

  constructor(private readonly pool: pg.Pool) {}

  async resolve(oids: readonly number[]): Promise<Map<number, string>> {
    if (this.names.size === 0) {
      await this.load()
    }
    const missing = oids.filter((oid) => !this.names.has(oid))
    if (missing.length > 0) {
      const result = await this.pool.query<{ oid: number; name: string }>(
        "SELECT oid::int AS oid, format_type(oid, NULL) AS name FROM pg_type WHERE oid = ANY($1::oid[])",
        [missing],
      )
      for (const row of result.rows) {
        this.names.set(Number(row.oid), row.name)
      }
    }
    return this.names
  }

  nameOf(oid: number): string {
    return this.names.get(oid) ?? `oid:${oid}`
  }

  private load(): Promise<void> {
    this.loading ??= this.pool
      .query<{ oid: number; name: string }>(
        "SELECT oid::int AS oid, format_type(oid, NULL) AS name FROM pg_type WHERE typnamespace = 'pg_catalog'::regnamespace",
      )
      .then((result) => {
        for (const row of result.rows) {
          this.names.set(Number(row.oid), row.name)
        }
      })
    return this.loading
  }
}
