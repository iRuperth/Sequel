import type { SeasonalityProfile } from "../pools"
import { WeightedPicker, type Random } from "../random"
import {
  MS_PER_DAY,
  MS_PER_HOUR,
  dayIndexOf,
  dayStartMs,
  monthIndex,
  weekdayIndex,
  type Clock,
} from "../time"

const MAX_REJECTION_ATTEMPTS = 64

export class TimeSampler {
  private readonly dayWeights: Float64Array
  private readonly dayPicker: WeightedPicker<number>
  private readonly hourPicker: WeightedPicker<number>
  private readonly maxDayWeight: number

  constructor(
    private readonly clock: Clock,
    profile: SeasonalityProfile,
  ) {
    this.dayWeights = new Float64Array(clock.dayCount)
    const days: number[] = []
    let maxWeight = 0
    for (let day = 0; day < clock.dayCount; day += 1) {
      const start = dayStartMs(clock, day)
      const progress = clock.dayCount > 1 ? day / (clock.dayCount - 1) : 1
      const weight =
        Math.exp(profile.growth * progress) *
        (profile.weekday[weekdayIndex(start)] ?? 1) *
        (profile.month[monthIndex(start)] ?? 1)
      this.dayWeights[day] = weight
      maxWeight = Math.max(maxWeight, weight)
      days.push(day)
    }
    this.maxDayWeight = maxWeight
    this.dayPicker = new WeightedPicker(days, Array.from(this.dayWeights))
    const hours = Array.from({ length: 24 }, (_value, hour) => hour)
    this.hourPicker = new WeightedPicker(hours, profile.hour)
  }

  dayWeight(day: number): number {
    return this.dayWeights[day] ?? 0
  }

  sampleDay(random: Random): number {
    return this.dayPicker.pick(random)
  }

  sampleDayInRange(random: Random, fromDay: number, toDay: number): number {
    const low = Math.max(0, fromDay)
    const high = Math.min(this.clock.dayCount - 1, toDay)
    if (high <= low) {
      return low
    }
    for (let attempt = 0; attempt < MAX_REJECTION_ATTEMPTS; attempt += 1) {
      const day = random.int(low, high)
      if (random.next() * this.maxDayWeight <= this.dayWeight(day)) {
        return day
      }
    }
    return random.int(low, high)
  }

  timeOfDay(random: Random): number {
    const hour = this.hourPicker.pick(random)
    return hour * MS_PER_HOUR + Math.floor((random.next() * MS_PER_HOUR) / 1000) * 1000
  }

  sampleTimestamp(random: Random): number {
    return dayStartMs(this.clock, this.sampleDay(random)) + this.timeOfDay(random)
  }

  sampleTimestampInRange(random: Random, fromMs: number, toMs: number): number {
    const from = Math.max(fromMs, this.clock.startMs)
    const to = Math.min(toMs, this.clock.endMs)
    if (to <= from) {
      return from
    }
    const fromDay = dayIndexOf(this.clock, from)
    const toDay = dayIndexOf(this.clock, to)
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const day = this.sampleDayInRange(random, fromDay, toDay)
      const candidate = dayStartMs(this.clock, day) + this.timeOfDay(random)
      if (candidate >= from && candidate <= to) {
        return candidate
      }
    }
    return from + Math.floor((random.next() * (to - from)) / 1000) * 1000
  }

  spanDays(): number {
    return this.clock.dayCount
  }

  windowMs(): number {
    return this.clock.dayCount * MS_PER_DAY
  }
}
