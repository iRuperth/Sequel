import type { CurrenciesPool, Currency } from "../pools"
import type { Random } from "../random"
import type { Clock } from "../time"
import { roundToMinorUnits } from "./format"

export class FxTable {
  private readonly ratesByCurrency = new Map<string, Float64Array>()
  private readonly currencyByCode = new Map<string, Currency>()

  constructor(
    readonly clock: Clock,
    readonly pool: CurrenciesPool,
    random: Random,
  ) {
    for (const currency of pool.currencies) {
      this.currencyByCode.set(currency.code, currency)
      const series = new Float64Array(clock.dayCount)
      const anchor = Math.log(currency.eurRate)
      let level = anchor + currency.dailyVolatility * 6 * random.normal()
      for (let day = 0; day < clock.dayCount; day += 1) {
        if (currency.code === pool.baseCurrency) {
          series[day] = 1
          continue
        }
        level +=
          currency.meanReversion * (anchor - level) + currency.dailyVolatility * random.normal()
        series[day] = Number(Math.exp(level).toFixed(8))
      }
      this.ratesByCurrency.set(currency.code, series)
    }
  }

  get baseCurrency(): string {
    return this.pool.baseCurrency
  }

  get currencies(): readonly Currency[] {
    return this.pool.currencies
  }

  currency(code: string): Currency {
    const currency = this.currencyByCode.get(code)
    if (!currency) {
      throw new Error(`Unknown currency ${code}`)
    }
    return currency
  }

  rate(code: string, day: number): number {
    const series = this.ratesByCurrency.get(code)
    if (!series) {
      throw new Error(`Unknown currency ${code}`)
    }
    const index = Math.min(Math.max(day, 0), series.length - 1)
    return series[index] as number
  }

  convertCents(cents: number, from: string, to: string, day: number): number {
    if (from === to) {
      return cents
    }
    const converted = (cents / this.rate(from, day)) * this.rate(to, day)
    return Math.max(1, roundToMinorUnits(converted, this.currency(to).minorUnits))
  }

  fromEurCents(eurCents: number, to: string, day: number): number {
    const converted = eurCents * this.rate(to, day)
    const rounded = roundToMinorUnits(converted, this.currency(to).minorUnits)
    return Math.max(this.currency(to).minorUnits >= 2 ? 1 : 100, rounded)
  }
}
