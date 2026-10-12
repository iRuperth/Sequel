import type { Row } from "../csv"
import type { Pools } from "../pools"
import type { Random } from "../random"
import type { Clock } from "../time"

export interface GeneratorInput {
  seed: number
  asOfDate: string
  scale: number
}

export interface GeneratedTable {
  readonly name: string
  readonly columns: readonly string[]
  readonly rowCount: number
  rows(): Iterable<Row>
}

export interface GeneratedDataset {
  readonly slug: string
  readonly input: GeneratorInput
  readonly tables: readonly GeneratedTable[]
}

export interface GeneratorContext {
  readonly slug: string
  readonly input: GeneratorInput
  readonly pools: Pools
  readonly clock: Clock
  random(stream: string): Random
  scaled(base: number, minimum?: number): number
}

export type DatasetGenerator = (context: GeneratorContext) => GeneratedTable[]

export function defineTable<TRecord>(
  name: string,
  columns: readonly string[],
  records: readonly TRecord[],
  toRow: (record: TRecord, index: number) => Row,
): GeneratedTable {
  return {
    name,
    columns,
    rowCount: records.length,
    *rows() {
      for (let index = 0; index < records.length; index += 1) {
        const row = toRow(records[index] as TRecord, index)
        if (row.length !== columns.length) {
          throw new Error(
            `Table ${name} produced ${row.length} cells for ${columns.length} columns at row ${index}`,
          )
        }
        yield row
      }
    },
  }
}
