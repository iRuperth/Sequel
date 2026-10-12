const UINT32_RANGE = 0x100000000
const HEX_ALPHABET = "0123456789abcdef"
const DIGIT_ALPHABET = "0123456789"
const UPPER_ALPHANUMERIC_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

export function hashString(value: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

function splitMix32(initial: number): () => number {
  let state = initial >>> 0
  return () => {
    state = (state + 0x9e3779b9) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 16), 0x85ebca6b)
    value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35)
    return (value ^ (value >>> 16)) >>> 0
  }
}

export class Random {
  private a: number
  private b: number
  private c: number
  private d: number
  private spareNormal: number | null = null

  constructor(
    readonly seed: number,
    readonly stream: string = "",
  ) {
    const low = seed >>> 0
    const high = Math.floor(Math.abs(seed) / UINT32_RANGE) >>> 0
    const mixer = splitMix32(low ^ hashString(stream) ^ Math.imul(high, 0x27d4eb2d))
    this.a = mixer()
    this.b = mixer()
    this.c = mixer()
    this.d = mixer()
    for (let round = 0; round < 12; round += 1) {
      this.nextUint32()
    }
  }

  fork(stream: string): Random {
    return new Random(this.seed, `${this.stream}/${stream}`)
  }

  nextUint32(): number {
    const t = (((this.a + this.b) | 0) + this.d) | 0
    this.d = (this.d + 1) | 0
    this.a = this.b ^ (this.b >>> 9)
    this.b = (this.c + (this.c << 3)) | 0
    this.c = (this.c << 21) | (this.c >>> 11)
    this.c = (this.c + t) | 0
    return t >>> 0
  }

  next(): number {
    return this.nextUint32() / UINT32_RANGE
  }

  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1))
  }

  float(min: number, max: number): number {
    return min + this.next() * (max - min)
  }

  chance(probability: number): boolean {
    return this.next() < probability
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error("Cannot pick from an empty list")
    }
    return items[Math.floor(this.next() * items.length)] as T
  }

  normal(): number {
    if (this.spareNormal !== null) {
      const spare = this.spareNormal
      this.spareNormal = null
      return spare
    }
    let u = this.next()
    while (u <= Number.EPSILON) {
      u = this.next()
    }
    const v = this.next()
    const radius = Math.sqrt(-2 * Math.log(u))
    const angle = 2 * Math.PI * v
    this.spareNormal = radius * Math.sin(angle)
    return radius * Math.cos(angle)
  }

  logNormal(mean: number, sigma: number): number {
    const mu = Math.log(mean) - (sigma * sigma) / 2
    return Math.exp(mu + sigma * this.normal())
  }

  exponential(mean: number): number {
    let u = this.next()
    while (u <= Number.EPSILON) {
      u = this.next()
    }
    return -Math.log(u) * mean
  }

  pareto(alpha: number, minimum = 1): number {
    let u = this.next()
    while (u <= Number.EPSILON) {
      u = this.next()
    }
    return minimum / Math.pow(u, 1 / alpha)
  }

  poisson(lambda: number): number {
    if (lambda <= 0) {
      return 0
    }
    if (lambda > 40) {
      return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * this.normal()))
    }
    const limit = Math.exp(-lambda)
    let count = 0
    let product = this.next()
    while (product > limit) {
      count += 1
      product *= this.next()
    }
    return count
  }

  geometric(mean: number): number {
    if (mean <= 0) {
      return 0
    }
    const probability = 1 / (mean + 1)
    let u = this.next()
    while (u <= Number.EPSILON) {
      u = this.next()
    }
    return Math.floor(Math.log(u) / Math.log(1 - probability))
  }

  shuffle<T>(items: T[]): T[] {
    for (let index = items.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(this.next() * (index + 1))
      const current = items[index] as T
      items[index] = items[swap] as T
      items[swap] = current
    }
    return items
  }

  sample<T>(items: readonly T[], count: number): T[] {
    const copy = [...items]
    const size = Math.min(count, copy.length)
    for (let index = 0; index < size; index += 1) {
      const swap = index + Math.floor(this.next() * (copy.length - index))
      const current = copy[index] as T
      copy[index] = copy[swap] as T
      copy[swap] = current
    }
    return copy.slice(0, size)
  }

  fromAlphabet(alphabet: string, length: number): string {
    let output = ""
    for (let index = 0; index < length; index += 1) {
      output += alphabet.charAt(Math.floor(this.next() * alphabet.length))
    }
    return output
  }

  hex(length: number): string {
    return this.fromAlphabet(HEX_ALPHABET, length)
  }

  digits(length: number): string {
    return this.fromAlphabet(DIGIT_ALPHABET, length)
  }

  code(length: number): string {
    return this.fromAlphabet(UPPER_ALPHANUMERIC_ALPHABET, length)
  }
}

export class WeightedPicker<T> {
  private readonly cumulative: Float64Array
  readonly total: number

  constructor(
    readonly items: readonly T[],
    weights: readonly number[],
  ) {
    if (items.length === 0 || items.length !== weights.length) {
      throw new Error("Weighted picker needs one positive weight per item")
    }
    this.cumulative = new Float64Array(items.length)
    let running = 0
    for (let index = 0; index < items.length; index += 1) {
      running += Math.max(0, weights[index] ?? 0)
      this.cumulative[index] = running
    }
    if (running <= 0) {
      throw new Error("Weighted picker needs at least one positive weight")
    }
    this.total = running
  }

  pickIndex(random: Random): number {
    const target = random.next() * this.total
    let low = 0
    let high = this.cumulative.length - 1
    while (low < high) {
      const middle = (low + high) >>> 1
      if ((this.cumulative[middle] as number) > target) {
        high = middle
      } else {
        low = middle + 1
      }
    }
    return low
  }

  pick(random: Random): T {
    return this.items[this.pickIndex(random)] as T
  }
}

export interface WeightedValueItem {
  value: string
  weight: number
}

export function weightedPicker<T extends { weight: number }>(
  items: readonly T[],
): WeightedPicker<T> {
  return new WeightedPicker(
    items,
    items.map((item) => item.weight),
  )
}
