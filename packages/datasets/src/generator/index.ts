import { loadPools, type Pools } from "../pools"
import { createGeneratorContext } from "./context"
import { generateEcommerce } from "./ecommerce"
import { generateFinance } from "./finance"
import { generateFintech } from "./fintech"
import { generateHr } from "./hr"
import type { DatasetGenerator, GeneratedDataset, GeneratorInput } from "./types"
import { generateWeb } from "./web"

const GENERATORS: Readonly<Record<string, DatasetGenerator>> = {
  fintech: generateFintech,
  ecommerce: generateEcommerce,
  hr: generateHr,
  web: generateWeb,
  finance: generateFinance,
}

export interface GenerateDatasetOptions extends GeneratorInput {
  root: string
  pools?: Pools
}

export function listGeneratorSlugs(): string[] {
  return Object.keys(GENERATORS)
}

export function hasGenerator(slug: string): boolean {
  return Object.hasOwn(GENERATORS, slug)
}

export function generateDatasetWithPools(
  slug: string,
  input: GeneratorInput,
  pools: Pools,
): GeneratedDataset {
  const generator = GENERATORS[slug]
  if (!generator) {
    throw new Error(`No generator is registered for dataset ${slug}`)
  }
  const context = createGeneratorContext(slug, input, pools)
  return { slug, input: context.input, tables: generator(context) }
}

export async function generateDataset(
  slug: string,
  options: GenerateDatasetOptions,
): Promise<GeneratedDataset> {
  const pools = options.pools ?? (await loadPools(options.root))
  return generateDatasetWithPools(
    slug,
    { seed: options.seed, asOfDate: options.asOfDate, scale: options.scale },
    pools,
  )
}
