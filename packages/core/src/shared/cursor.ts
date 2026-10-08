export type KeysetCursor = { at: Date; id: string }

export function encodeCursor(cursor: KeysetCursor): string {
  return Buffer.from(`${cursor.at.toISOString()}|${cursor.id}`, "utf8").toString("base64url")
}

export function decodeCursor(value: string | undefined): KeysetCursor | null {
  if (!value) {
    return null
  }
  const [at, id] = Buffer.from(value, "base64url").toString("utf8").split("|")
  if (!at || !id) {
    return null
  }
  const date = new Date(at)
  return Number.isNaN(date.getTime()) ? null : { at: date, id }
}
