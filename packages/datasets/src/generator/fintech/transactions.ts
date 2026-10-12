import type { Row } from "../../csv"
import {
  weightedPicker,
  type Random,
  type WeightedPicker,
  type WeightedValueItem,
} from "../../random"
import { MS_PER_DAY, MS_PER_HOUR, dayIndexOf, formatTimestamp } from "../../time"
import { money, roundToMinorUnits, toCents } from "../format"
import { defineTable, type GeneratedTable } from "../types"
import type { MerchantDirectory } from "./merchants"
import {
  sortByTime,
  type Card,
  type CardTransaction,
  type FintechEnvironment,
  type Merchant,
} from "./model"

const MERCHANT_PICK_ATTEMPTS = 6
const MAX_EUR_AMOUNT = 12000
const MIN_EUR_CENTS = 50

interface PurchaseContext {
  env: FintechEnvironment
  directory: MerchantDirectory
  random: Random
  declineReasons: WeightedPicker<WeightedValueItem>
  nextSequence: () => number
}

function pickMerchant(
  context: PurchaseContext,
  card: Card,
  createdAt: number,
  atm: boolean,
): Merchant {
  const { env, directory, random } = context
  const holder = card.holder
  const crossBorderShare = env.context.pools.fintech.rates.crossBorderShare
  for (let attempt = 0; attempt < MERCHANT_PICK_ATTEMPTS; attempt += 1) {
    const abroad = random.chance(crossBorderShare * holder.travelPropensity)
    const country = abroad ? env.geography.travelCountry(random).code : holder.countryCode
    const online =
      !atm &&
      (card.formFactor === "virtual" ? random.chance(0.9) : random.chance(directory.onlineShare))
    const candidate = atm
      ? (directory.atmByCountry.get(country) ?? directory.anyAtm).pick(random)
      : online
        ? directory.online.pick(random)
        : (directory.physicalByCountry.get(country) ?? directory.anyPhysical).pick(random)
    if (candidate.createdAt <= createdAt) {
      return candidate
    }
  }
  return directory.merchants[0] as Merchant
}

function createAuthorization(
  context: PurchaseContext,
  card: Card,
  createdAt: number,
): CardTransaction {
  const { env, random } = context
  const pool = env.context.pools.fintech
  const rates = pool.rates
  const fx = env.fx
  const day = dayIndexOf(env.context.clock, createdAt)
  const atm = card.formFactor === "physical" && random.chance(rates.atmShare)
  const merchant = pickMerchant(context, card, createdAt, atm)
  const category = merchant.category
  const currency = merchant.online && random.chance(0.85) ? card.currency : merchant.currency
  const eurAmount = Math.min(
    MAX_EUR_AMOUNT,
    random.logNormal(category.meanAmountEur, category.amountSigma),
  )
  let amountCents = fx.fromEurCents(Math.max(MIN_EUR_CENTS, toCents(eurAmount)), currency, day)
  if (atm) {
    const step = fx.currency(currency).minorUnits >= 2 ? 1000 : 100000
    amountCents = Math.max(step, Math.round(amountCents / step) * step)
  }
  const channel = atm
    ? "atm"
    : merchant.online
      ? "ecommerce"
      : eurAmount > 50
        ? random.chance(0.75)
          ? "chip"
          : "contactless"
        : random.chance(0.8)
          ? "contactless"
          : "chip"
  const crossBorder = currency !== card.currency
  const declineProbability =
    rates.declineShare *
    (category.highRisk ? rates.highRiskDeclineMultiplier : 1) *
    (card.holder.riskRating === "high" ? 1.6 : 1) *
    (crossBorder ? 1.4 : 1)
  const transaction: CardTransaction = {
    id: 0,
    sequence: context.nextSequence(),
    card,
    merchant,
    merchantMapped: !random.chance(rates.unmappedMerchantShare),
    descriptor: merchant.online
      ? `${merchant.descriptorBase}*${random.code(6)}`
      : merchant.descriptorBase,
    type: atm ? "atm_withdrawal" : "purchase",
    channel,
    amountCents,
    currency,
    billingCents: fx.convertCents(amountCents, currency, card.currency, day),
    billingCurrency: card.currency,
    status: "settled",
    declineReason: null,
    createdAt,
    settledAt: null,
    duplicateOf: null,
    hasAlert: false,
  }
  if (random.chance(declineProbability)) {
    transaction.status = "declined"
    transaction.declineReason =
      (category.highRisk || crossBorder) && random.chance(0.3)
        ? pool.fraudDeclineReason
        : context.declineReasons.pick(random).value
  } else if (random.chance(rates.reversalShare)) {
    transaction.status = "reversed"
  } else {
    settle(context, transaction, createdAt)
  }
  return transaction
}

function settle(
  context: PurchaseContext,
  transaction: CardTransaction,
  authorisedAt: number,
): void {
  const [minLag, maxLag] = context.env.context.pools.fintech.rates.settlementLagHours
  const settledAt =
    authorisedAt + Math.floor((context.random.float(minLag, maxLag) * MS_PER_HOUR) / 1000) * 1000
  if (settledAt > context.env.context.clock.endMs) {
    transaction.status = "authorized"
    transaction.settledAt = null
  } else {
    transaction.status = "settled"
    transaction.settledAt = settledAt
  }
}

export function buildTransactions(
  env: FintechEnvironment,
  cards: readonly Card[],
  directory: MerchantDirectory,
): CardTransaction[] {
  const { context, fx } = env
  const rates = context.pools.fintech.rates
  const random = context.random("transactions")
  const { startMs, endMs } = context.clock
  const target = context.scaled(context.pools.volumes.fintech.transactions, 500)
  const baseTarget = Math.round(target / (1 + rates.refundShare * 0.9 + rates.duplicateSwipeShare))
  let sequence = 0
  const purchaseContext: PurchaseContext = {
    env,
    directory,
    random,
    declineReasons: weightedPicker(context.pools.fintech.declineReasons),
    nextSequence: () => sequence++,
  }

  const exposures = cards.map((card) => {
    const end = Math.min(card.deactivatedAt ?? endMs, endMs)
    return Math.max(0, (end - Math.max(card.issuedAt, startMs)) / MS_PER_DAY) * card.activityWeight
  })
  const totalExposure = exposures.reduce((sum, value) => sum + value, 0)
  const transactions: CardTransaction[] = []
  cards.forEach((card, index) => {
    const expected =
      totalExposure > 0 ? (baseTarget * (exposures[index] as number)) / totalExposure : 0
    const count = Math.floor(expected) + (random.chance(expected - Math.floor(expected)) ? 1 : 0)
    const from = Math.max(card.issuedAt + MS_PER_HOUR, startMs)
    const to = Math.min(card.deactivatedAt ?? endMs, endMs)
    for (let item = 0; item < count; item += 1) {
      const createdAt = env.cardPayments.sampleTimestampInRange(random, from, to)
      transactions.push(createAuthorization(purchaseContext, card, createdAt))
    }
  })

  const extras: CardTransaction[] = []
  for (const original of transactions) {
    if (
      original.type !== "purchase" ||
      original.status === "declined" ||
      original.status === "reversed"
    ) {
      continue
    }
    if (original.status === "settled" && random.chance(rates.refundShare)) {
      const createdAt =
        original.createdAt + random.int(1, 25) * MS_PER_DAY + random.int(-6, 6) * MS_PER_HOUR
      if (createdAt < endMs) {
        const day = dayIndexOf(context.clock, createdAt)
        const share = random.chance(0.65) ? 1 : random.float(0.2, 0.9)
        const minorUnits = fx.currency(original.currency).minorUnits
        const amountCents = Math.max(
          minorUnits >= 2 ? 1 : 100,
          roundToMinorUnits(original.amountCents * share, minorUnits),
        )
        const refund: CardTransaction = {
          ...original,
          sequence: sequence++,
          type: "refund",
          amountCents,
          billingCents: fx.convertCents(
            amountCents,
            original.currency,
            original.card.currency,
            day,
          ),
          createdAt,
          settledAt: null,
          declineReason: null,
          duplicateOf: null,
        }
        settle(purchaseContext, refund, createdAt)
        extras.push(refund)
      }
    }
    if (random.chance(rates.duplicateSwipeShare)) {
      const createdAt = original.createdAt + random.int(5, 115) * 1000
      if (createdAt < endMs) {
        const duplicate: CardTransaction = {
          ...original,
          sequence: sequence++,
          createdAt,
          duplicateOf: original,
          settledAt:
            original.settledAt === null ? null : original.settledAt + random.int(1, 40) * 1000,
        }
        if (duplicate.settledAt !== null && duplicate.settledAt > endMs) {
          duplicate.status = "authorized"
          duplicate.settledAt = null
        }
        extras.push(duplicate)
      }
    }
  }
  transactions.push(...extras)

  for (const transaction of transactions) {
    if (
      transaction.type === "purchase" &&
      transaction.currency !== transaction.card.currency &&
      random.chance(rates.currencyMismatchShareOfCrossBorder)
    ) {
      transaction.billingCurrency = transaction.currency
      transaction.billingCents = transaction.amountCents
    }
  }

  sortByTime(transactions, (transaction) => transaction.createdAt)
  transactions.forEach((transaction, index) => {
    transaction.id = index + 1
    if (transaction.status === "settled") {
      const sign = transaction.type === "refund" ? -1 : 1
      transaction.card.account.cardOutflowCents += sign * transaction.billingCents
    }
  })
  return transactions
}

export function transactionsTable(transactions: readonly CardTransaction[]): GeneratedTable {
  return defineTable(
    "transactions",
    [
      "transaction_id",
      "card_id",
      "account_id",
      "merchant_id",
      "merchant_descriptor",
      "mcc",
      "transaction_type",
      "channel",
      "amount",
      "currency",
      "billing_amount",
      "billing_currency",
      "status",
      "decline_reason",
      "created_at",
      "settled_at",
    ],
    transactions,
    (transaction): Row => [
      transaction.id,
      transaction.card.id,
      transaction.card.account.id,
      transaction.merchantMapped ? transaction.merchant.id : null,
      transaction.descriptor,
      transaction.merchant.category.mcc,
      transaction.type,
      transaction.channel,
      money(transaction.amountCents),
      transaction.currency,
      money(transaction.billingCents),
      transaction.billingCurrency,
      transaction.status,
      transaction.declineReason,
      formatTimestamp(transaction.createdAt),
      transaction.settledAt === null ? null : formatTimestamp(transaction.settledAt),
    ],
  )
}
