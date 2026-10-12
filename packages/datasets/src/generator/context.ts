import { z } from "zod"
import type { Pools } from "../pools"
import { Random } from "../random"
import { createClock, parseIsoDate } from "../time"
import type { GeneratorContext, GeneratorInput } from "./types"

export const generatorInputSchema = z.object({
  seed: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  asOfDate: z.string().refine((value) => {
    try {
      parseIsoDate(value)
      return true
    } catch {
      return false
    }
  }, "must be an ISO date (YYYY-MM-DD)"),
  scale: z.number().positive().max(50),
})

export function createGeneratorContext(
  slug: string,
  input: GeneratorInput,
  pools: Pools,
): GeneratorContext {
  const validated = generatorInputSchema.parse(input)
  const clock = createClock(validated.asOfDate, pools.volumes.windowMonths)
  return {
    slug,
    input: validated,
    pools,
    clock,
    random(stream: string) {
      return new Random(validated.seed, `${slug}.${stream}`)
    },
    scaled(base: number, minimum = 1) {
      return Math.max(minimum, Math.round(base * validated.scale))
    },
  }
}
