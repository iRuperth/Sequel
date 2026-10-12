import type { Row } from "../../csv"
import type { MerchantCategory } from "../../pools"
import { WeightedPicker, type Random } from "../../random"
import { MS_PER_DAY, formatTimestamp } from "../../time"
import { defineTable, type GeneratedTable } from "../types"
import type { FintechEnvironment, Merchant } from "./model"

const DESCRIPTOR_NAME_LENGTH = 22
const DESCRIPTOR_CITY_LENGTH = 13

export interface MerchantDirectory {
  merchants: Merchant[]
  online: WeightedPicker<Merchant>
  onlineShare: number
  physicalByCountry: Map<string, WeightedPicker<Merchant>>
  atmByCountry: Map<string, WeightedPicker<Merchant>>
  anyAtm: WeightedPicker<Merchant>
  anyPhysical: WeightedPicker<Merchant>
}

function descriptorBase(name: string, city: string | null): string {
  const cleanName = name
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, "")
    .slice(0, DESCRIPTOR_NAME_LENGTH)
    .trim()
  if (city === null) {
    return cleanName
  }
  return `${cleanName} ${city
    .toUpperCase()
    .replace(/[^A-Z ]+/g, "")
    .slice(0, DESCRIPTOR_CITY_LENGTH)
    .trim()}`
}

function pickerFrom(merchants: readonly Merchant[]): WeightedPicker<Merchant> {
  return new WeightedPicker(
    merchants,
    merchants.map((merchant) => merchant.weight),
  )
}

function groupPickers(
  merchants: readonly Merchant[],
  predicate: (merchant: Merchant) => boolean,
): Map<string, WeightedPicker<Merchant>> {
  const groups = new Map<string, Merchant[]>()
  for (const merchant of merchants) {
    if (!predicate(merchant)) {
      continue
    }
    const list = groups.get(merchant.countryCode) ?? []
    list.push(merchant)
    groups.set(merchant.countryCode, list)
  }
  const pickers = new Map<string, WeightedPicker<Merchant>>()
  for (const [country, list] of groups) {
    pickers.set(country, pickerFrom(list))
  }
  return pickers
}

export function merchantCategoriesTable(categories: readonly MerchantCategory[]): GeneratedTable {
  const sorted = [...categories].sort((left, right) => left.mcc.localeCompare(right.mcc))
  return defineTable(
    "merchant_categories",
    ["mcc", "category_name", "category_group", "is_high_risk"],
    sorted,
    (category): Row => [category.mcc, category.name, category.group, category.highRisk],
  )
}

function createdAt(random: Random, startMs: number, endMs: number): number {
  if (random.chance(0.82)) {
    return startMs - Math.floor(random.float(1, 900)) * MS_PER_DAY + random.int(0, 86399) * 1000
  }
  return startMs + Math.floor(random.next() * (endMs - startMs - 30 * MS_PER_DAY))
}

export function buildMerchants(env: FintechEnvironment): MerchantDirectory {
  const { context, geography } = env
  const pool = context.pools.fintech
  const random = context.random("merchants")
  const { startMs, endMs } = context.clock
  const categories = pool.merchantCategories
  const categoryByMcc = new Map(categories.map((category) => [category.mcc, category]))
  const categoryPicker = new WeightedPicker(
    categories,
    categories.map((category) => category.merchantWeight),
  )
  const total = context.scaled(context.pools.volumes.fintech.merchants, 60)
  const merchants: Merchant[] = []
  const rawWeights: number[] = []

  for (const heavy of pool.heavyMerchants) {
    const category = categoryByMcc.get(heavy.mcc)
    if (!category) {
      throw new Error(`Heavy merchant ${heavy.name} uses unknown MCC ${heavy.mcc}`)
    }
    const country = geography.country(heavy.countryCode)
    merchants.push({
      id: 0,
      name: heavy.name,
      category,
      countryCode: country.code,
      city: heavy.online ? null : geography.city(random, country.code),
      currency: country.currency,
      online: heavy.online,
      createdAt: startMs - random.int(400, 1500) * MS_PER_DAY + random.int(0, 86399) * 1000,
      weight: 0,
      descriptorBase: descriptorBase(heavy.name, null),
    })
    rawWeights.push(-heavy.weightMultiplier)
  }

  const atmCategory = categoryByMcc.get(pool.atmMcc)
  for (const country of geography.countries) {
    if (!atmCategory) {
      break
    }
    const atmCount = Math.max(1, Math.round((country.residentWeight + country.travelWeight) / 6))
    for (let index = 0; index < atmCount; index += 1) {
      const city = geography.city(random, country.code)
      const name = `${random.pick(pool.merchantStems)} ${random.pick(atmCategory.nameSuffixes)}`
      merchants.push({
        id: 0,
        name,
        category: atmCategory,
        countryCode: country.code,
        city,
        currency: country.currency,
        online: false,
        createdAt: createdAt(random, startMs, endMs),
        weight: 0,
        descriptorBase: descriptorBase(name, city),
      })
      rawWeights.push(random.pareto(1.6))
    }
  }

  while (merchants.length < total) {
    const category = categoryPicker.pick(random)
    if (category.mcc === pool.atmMcc) {
      continue
    }
    const online = random.chance(category.onlineShare)
    const country = online
      ? geography.onlineHubCountry(random)
      : random.chance(0.78)
        ? geography.residentCountry(random)
        : geography.travelCountry(random)
    const city = online ? null : geography.city(random, country.code)
    const name = `${random.pick(pool.merchantStems)} ${random.pick(category.nameSuffixes)}`
    merchants.push({
      id: 0,
      name,
      category,
      countryCode: country.code,
      city,
      currency: country.currency,
      online,
      createdAt: createdAt(random, startMs, endMs),
      weight: 0,
      descriptorBase: descriptorBase(name, city),
    })
    rawWeights.push(Math.min(60, random.pareto(1.25)))
  }

  const categoryTotals = new Map<string, { raw: number; count: number }>()
  merchants.forEach((merchant, index) => {
    const raw = rawWeights[index] as number
    if (raw > 0) {
      const entry = categoryTotals.get(merchant.category.mcc) ?? { raw: 0, count: 0 }
      entry.raw += raw
      entry.count += 1
      categoryTotals.set(merchant.category.mcc, entry)
    }
  })
  merchants.forEach((merchant, index) => {
    const raw = rawWeights[index] as number
    const totals = categoryTotals.get(merchant.category.mcc)
    const categoryWeight = merchant.category.transactionWeight
    if (raw < 0) {
      const average =
        totals && totals.count > 0 ? categoryWeight / totals.count : categoryWeight / 10
      merchant.weight = -raw * average
    } else if (merchant.category.mcc === pool.atmMcc) {
      merchant.weight = raw
    } else {
      merchant.weight = totals ? (raw / totals.raw) * categoryWeight : raw
    }
  })

  const ordered = merchants
    .map((merchant, index) => ({ merchant, index }))
    .sort(
      (left, right) =>
        left.merchant.createdAt - right.merchant.createdAt || left.index - right.index,
    )
    .map((entry) => entry.merchant)
  ordered.forEach((merchant, index) => {
    merchant.id = index + 1
  })

  const purchasable = ordered.filter(
    (merchant) => merchant.category.mcc !== pool.atmMcc && merchant.weight > 0,
  )
  const onlineMerchants = purchasable.filter((merchant) => merchant.online)
  const physicalMerchants = purchasable.filter((merchant) => !merchant.online)
  const atms = ordered.filter((merchant) => merchant.category.mcc === pool.atmMcc)
  const categoryWeight = categories.reduce((sum, category) => sum + category.transactionWeight, 0)
  const onlineCategoryWeight = categories.reduce(
    (sum, category) => sum + category.transactionWeight * category.onlineShare,
    0,
  )

  return {
    merchants: ordered,
    online: pickerFrom(onlineMerchants),
    onlineShare: categoryWeight > 0 ? onlineCategoryWeight / categoryWeight : 0,
    physicalByCountry: groupPickers(physicalMerchants, () => true),
    atmByCountry: groupPickers(atms, () => true),
    anyAtm: pickerFrom(atms),
    anyPhysical: pickerFrom(physicalMerchants),
  }
}

export function merchantsTable(merchants: readonly Merchant[]): GeneratedTable {
  return defineTable(
    "merchants",
    [
      "merchant_id",
      "merchant_name",
      "mcc",
      "country_code",
      "city",
      "currency",
      "is_online",
      "created_at",
    ],
    merchants,
    (merchant): Row => [
      merchant.id,
      merchant.name,
      merchant.category.mcc,
      merchant.countryCode,
      merchant.city,
      merchant.currency,
      merchant.online,
      formatTimestamp(merchant.createdAt),
    ],
  )
}
