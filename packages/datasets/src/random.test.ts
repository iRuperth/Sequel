import { describe, expect, it } from "vitest"
import { Random, WeightedPicker } from "./random"

function sequence(random: Random, length: number): number[] {
  return Array.from({ length }, () => random.nextUint32())
}

describe("Random", () => {
  it("produces the same sequence for the same seed and stream", () => {
    expect(sequence(new Random(20260101, "fintech.transactions"), 64)).toEqual(
      sequence(new Random(20260101, "fintech.transactions"), 64),
    )
  })

  it("produces independent sequences for different seeds and streams", () => {
    const base = sequence(new Random(20260101, "a"), 16)
    expect(sequence(new Random(20260102, "a"), 16)).not.toEqual(base)
    expect(sequence(new Random(20260101, "b"), 16)).not.toEqual(base)
  })

  it("keeps floats in the unit interval with a sensible mean", () => {
    const random = new Random(7, "uniform")
    let sum = 0
    for (let index = 0; index < 20000; index += 1) {
      const value = random.next()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
      sum += value
    }
    expect(sum / 20000).toBeGreaterThan(0.48)
    expect(sum / 20000).toBeLessThan(0.52)
  })

  it("returns integers inside the inclusive range", () => {
    const random = new Random(11, "ints")
    const seen = new Set<number>()
    for (let index = 0; index < 2000; index += 1) {
      const value = random.int(3, 6)
      expect(Number.isInteger(value)).toBe(true)
      expect(value).toBeGreaterThanOrEqual(3)
      expect(value).toBeLessThanOrEqual(6)
      seen.add(value)
    }
    expect([...seen].sort()).toEqual([3, 4, 5, 6])
  })

  it("forks into reproducible child streams", () => {
    const parent = new Random(99, "root")
    expect(sequence(parent.fork("child"), 8)).toEqual(
      sequence(new Random(99, "root").fork("child"), 8),
    )
  })
})

describe("WeightedPicker", () => {
  it("never picks items with zero weight and follows the weights", () => {
    const picker = new WeightedPicker(["a", "b", "c"], [3, 0, 1])
    const random = new Random(5, "weights")
    const counts = { a: 0, b: 0, c: 0 }
    for (let index = 0; index < 8000; index += 1) {
      counts[picker.pick(random) as keyof typeof counts] += 1
    }
    expect(counts.b).toBe(0)
    expect(counts.a / counts.c).toBeGreaterThan(2.6)
    expect(counts.a / counts.c).toBeLessThan(3.4)
  })

  it("rejects pickers without positive weight", () => {
    expect(() => new WeightedPicker(["a"], [0])).toThrow()
  })
})
