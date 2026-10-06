import type pg from "pg"
import Cursor from "pg-cursor"
import type { ResultSet } from "@sequel/contracts"
import { sandboxTypes } from "./pools"
import { RowCollector, toColumnMeta, type ResultLimits } from "./results"
import type { TypeNameRegistry } from "./type-names"

export type StatementInput = { text: string; returnsRows: boolean }

type Field = { name: string; dataTypeID: number }

function readChunk(
  cursor: Cursor<unknown[]>,
  size: number,
): Promise<{
  rows: unknown[][]
  fields: Field[]
  command: string | null
  rowCount: number | null
}> {
  return new Promise((resolve, reject) => {
    cursor.read(size, (error, rows, result) => {
      if (error) {
        reject(error)
        return
      }
      resolve({
        rows: rows as unknown[][],
        fields: (result?.fields ?? []) as Field[],
        command: result?.command ?? null,
        rowCount: result?.rowCount ?? null,
      })
    })
  })
}

export async function runStatement(
  client: pg.PoolClient,
  statement: StatementInput,
  limits: ResultLimits & { fetchChunk: number },
  typeNames: TypeNameRegistry,
): Promise<ResultSet> {
  if (!statement.returnsRows) {
    const result = await client.query({ text: statement.text, rowMode: "array" })
    return {
      columns: [],
      rows: [],
      rowCount: 0,
      truncated: false,
      commandTag: result.command ?? null,
      affectedRows: result.rowCount ?? null,
    }
  }

  const cursor = client.query(
    new Cursor<unknown[]>(statement.text, [], { rowMode: "array", types: sandboxTypes }),
  )
  const collector = new RowCollector(limits)
  let fields: Field[] = []
  let command: string | null = null
  try {
    while (true) {
      const chunk = await readChunk(cursor, limits.fetchChunk)
      if (chunk.fields.length > 0) {
        fields = chunk.fields
      }
      command = chunk.command ?? command
      if (chunk.rows.length === 0) {
        break
      }
      if (!collector.add(chunk.rows)) {
        break
      }
    }
  } finally {
    await cursor.close()
  }
  await typeNames.resolve(fields.map((field) => field.dataTypeID))
  return {
    columns: toColumnMeta(fields, (oid) => typeNames.nameOf(oid)),
    rows: collector.rows,
    rowCount: collector.rows.length,
    truncated: collector.truncated,
    commandTag: command,
    affectedRows: null,
  }
}
