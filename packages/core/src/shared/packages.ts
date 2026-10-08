import { createRequire } from "node:module"
import { dirname } from "node:path"

const require = createRequire(import.meta.url)

export function packageDir(name: string): string {
  return dirname(require.resolve(`${name}/package.json`))
}
