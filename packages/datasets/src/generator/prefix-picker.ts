import type { Random } from "../random"

export class PrefixWeightedPicker<T> {
  private readonly cumulative: Float64Array
  private readonly times: Float64Array

  constructor(
    private readonly items: readonly T[],
    time: (item: T) => number,
    weight: (item: T) => number,
  ) {
    this.cumulative = new Float64Array(items.length)
    this.times = new Float64Array(items.length)
    let running = 0
    let previous = Number.NEGATIVE_INFINITY
    items.forEach((item, index) => {
      const at = time(item)
      if (at < previous) {
        throw new Error("Prefix picker items must be sorted by time")
      }
      previous = at
      running += Math.max(0, weight(item))
      this.cumulative[index] = running
      this.times[index] = at
    })
  }

  private countUpTo(ms: number): number {
    let low = 0
    let high = this.times.length
    while (low < high) {
      const middle = (low + high) >>> 1
      if ((this.times[middle] as number) <= ms) {
        low = middle + 1
      } else {
        high = middle
      }
    }
    return low
  }

  pick(random: Random, upToMs: number): T | null {
    const count = this.countUpTo(upToMs)
    if (count === 0) {
      return null
    }
    const total = this.cumulative[count - 1] as number
    if (total <= 0) {
      return null
    }
    const target = random.next() * total
    let low = 0
    let high = count - 1
    while (low < high) {
      const middle = (low + high) >>> 1
      if ((this.cumulative[middle] as number) > target) {
        high = middle
      } else {
        low = middle + 1
      }
    }
    return this.items[low] as T
  }
}
