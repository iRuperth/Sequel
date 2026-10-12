import type { Row } from "../../csv"
import type { FintechPool } from "../../pools"
import {
  weightedPicker,
  type Random,
  type WeightedPicker,
  type WeightedValueItem,
} from "../../random"
import { MS_PER_DAY, MS_PER_HOUR, MS_PER_MINUTE, dayIndexOf, formatTimestamp } from "../../time"
import { fillTemplate, money, padNumber, roundToMinorUnits, toCents } from "../format"
import { defineTable, type GeneratedTable } from "../types"
import {
  fullName,
  sortByTime,
  type Account,
  type FintechEnvironment,
  type Holder,
  type Transfer,
  type TransferStatus,
  type TransferType,
} from "./model"

const MONTH_MS = 30.4 * MS_PER_DAY
const OUTBOUND_PER_MONTH = 0.42
const INTERNAL_PER_MONTH = 0.35
const INBOUND_PER_MONTH = 0.55

interface TransferPlan {
  account: Account
  savings: Account | null
  windowStart: number
  windowEnd: number
  outboundLambda: number
  internalLambda: number
  inboundLambda: number
}

class SchemeRouter {
  private readonly pickers: Map<string, WeightedPicker<WeightedValueItem>>
  private readonly delays: Map<string, readonly [number, number]>

  constructor(private readonly config: FintechPool["transferSchemes"]) {
    this.pickers = new Map(
      config.byCurrency.map((entry) => [entry.currency, weightedPicker(entry.schemes)]),
    )
    this.delays = new Map(config.settlementSeconds.map((entry) => [entry.scheme, entry.range]))
  }

  scheme(random: Random, currency: string, type: TransferType): string {
    if (type === "internal") {
      return this.config.internal
    }
    return this.pickers.get(currency)?.pick(random).value ?? this.config.fallback
  }

  settlementDelay(random: Random, scheme: string): number {
    const [min, max] = this.delays.get(scheme) ??
      this.delays.get(this.config.fallback) ?? [60, 3600]
    return random.int(min, max) * 1000
  }
}

export function buildTransfers(env: FintechEnvironment, holders: readonly Holder[]): Transfer[] {
  const { context, geography, people } = env
  const pool = context.pools.fintech
  const rates = pool.rates
  const random = context.random("transfers")
  const { startMs, endMs } = context.clock
  const router = new SchemeRouter(pool.transferSchemes)
  const payeePicker = weightedPicker(pool.payees)
  const inboundPicker = weightedPicker(pool.inboundReferences)
  const internalPicker = weightedPicker(pool.internalReferences)
  const target = context.scaled(context.pools.volumes.fintech.transfers, 20)
  const transfers: Transfer[] = []
  let sequence = 0

  const plans: TransferPlan[] = []
  for (const holder of holders) {
    const savings = holder.accounts.find((account) => account.type === "savings") ?? null
    for (const account of holder.accounts) {
      if (account.type === "savings") {
        continue
      }
      const windowStart = Math.max(account.openedAt, startMs)
      const windowEnd = Math.min(account.closedAt ?? endMs, endMs)
      const months = Math.max(0, (windowEnd - windowStart) / MONTH_MS)
      const businessFactor = account.type === "business" ? 1.8 : 1
      plans.push({
        account,
        savings: account.type === "current" ? savings : null,
        windowStart,
        windowEnd,
        outboundLambda: months * OUTBOUND_PER_MONTH * businessFactor,
        internalLambda: account.type === "current" && savings ? months * INTERNAL_PER_MONTH : 0,
        inboundLambda: months * INBOUND_PER_MONTH * businessFactor,
      })
    }
  }
  const failureShare = rates.transferFailureShare + rates.transferReturnShare
  const expected = plans.reduce(
    (sum, plan) => sum + plan.outboundLambda + plan.internalLambda + plan.inboundLambda,
    0,
  )
  const factor = expected > 0 ? (target * (1 - failureShare)) / expected : 0

  const counterpartyIban = (countryCode: string) =>
    `${countryCode}${padNumber(random.int(2, 98), 2)}${random.digits(4)}${random.digits(14)}`
  const referenceValues = (at: number) => {
    const date = new Date(at)
    return {
      month: pool.monthNames[date.getUTCMonth()] ?? "",
      year: String(date.getUTCFullYear()),
      week: String(Math.floor(dayIndexOf(context.clock, at) / 7) + 1),
    }
  }

  const add = (
    transfer: Omit<Transfer, "id" | "sequence" | "status" | "completedAt">,
    forced?: TransferStatus,
  ) => {
    let status: TransferStatus = forced ?? "completed"
    let completedAt: number | null = null
    if (status === "completed") {
      completedAt = transfer.initiatedAt + router.settlementDelay(random, transfer.scheme)
      if (completedAt > endMs) {
        status = "pending"
        completedAt = null
      }
    } else if (status === "returned") {
      completedAt = Math.min(endMs, transfer.initiatedAt + random.int(24, 96) * MS_PER_HOUR)
    }
    transfers.push({ ...transfer, id: 0, sequence: sequence++, status, completedAt })
  }

  for (const plan of plans) {
    const { account, windowStart, windowEnd } = plan
    if (windowEnd - windowStart < MS_PER_HOUR) {
      continue
    }
    const holder = account.holder
    const currency = account.currency
    let outflowCents = Math.max(0, account.cardOutflowCents)
    const outboundCount = random.poisson(plan.outboundLambda * factor)
    for (let index = 0; index < outboundCount; index += 1) {
      const payee = payeePicker.pick(random)
      const initiatedAt = env.transfers.sampleTimestampInRange(
        random,
        windowStart + MS_PER_DAY,
        windowEnd,
      )
      const day = dayIndexOf(context.clock, initiatedAt)
      const amountCents = env.fx.fromEurCents(
        toCents(random.logNormal(payee.meanAmountEur, 0.35)),
        currency,
        day,
      )
      const scheme = router.scheme(random, currency, "outbound")
      outflowCents += amountCents
      add({
        type: "outbound",
        fromAccount: account,
        toAccount: null,
        counterpartyName: payee.name,
        counterpartyIban: counterpartyIban(holder.countryCode),
        scheme,
        amountCents,
        currency,
        reference: fillTemplate(payee.reference, referenceValues(initiatedAt)),
        initiatedAt,
      })
    }
    const savings = plan.savings
    let savingsInflowCents = 0
    if (savings) {
      const internalCount = random.poisson(plan.internalLambda * factor)
      for (let index = 0; index < internalCount; index += 1) {
        const from = Math.max(windowStart, savings.openedAt) + MS_PER_HOUR
        const to = Math.min(windowEnd, savings.closedAt ?? endMs)
        if (to <= from) {
          break
        }
        const initiatedAt = env.transfers.sampleTimestampInRange(random, from, to)
        const day = dayIndexOf(context.clock, initiatedAt)
        const amountCents = env.fx.fromEurCents(toCents(random.logNormal(220, 0.8)), currency, day)
        outflowCents += amountCents
        savingsInflowCents += amountCents
        add({
          type: "internal",
          fromAccount: account,
          toAccount: savings,
          counterpartyName: null,
          counterpartyIban: null,
          scheme: router.scheme(random, currency, "internal"),
          amountCents,
          currency,
          reference: internalPicker.pick(random).template,
          initiatedAt,
        })
      }
    }
    const negative =
      account.type === "current" &&
      outflowCents > 20000 &&
      random.chance(rates.negativeBalanceAccountShare)
    const cover = negative ? random.float(0.8, 0.95) : random.float(1.03, 1.4)
    const buffer = negative ? 0 : toCents(random.logNormal(450, 0.9))
    let required = Math.max(0, Math.round(outflowCents * cover) + buffer - account.openingCents)
    const inboundCount = Math.max(1, random.poisson(plan.inboundLambda * factor))
    const openedInWindow = account.openedAt >= startMs
    const weights = Array.from({ length: inboundCount }, (_value, index) =>
      index === 0 && openedInWindow
        ? random.float(0.25, 0.45) * inboundCount
        : random.float(0.6, 1.4),
    )
    const weightTotal = weights.reduce((sum, value) => sum + value, 0)
    const employer = random.pick(pool.employers)
    const minorUnits = env.fx.currency(currency).minorUnits
    const minimum = minorUnits >= 2 ? 1000 : 100000
    let inboundCents = 0
    for (let index = 0; index < inboundCount; index += 1) {
      const isLast = index === inboundCount - 1
      const share = (weights[index] as number) / weightTotal
      const amountCents = Math.max(
        minimum,
        roundToMinorUnits(isLast ? required : required * share, minorUnits),
      )
      required = Math.max(0, required - amountCents)
      const initialDeposit = index === 0 && openedInWindow
      const initiatedAt = initialDeposit
        ? Math.min(windowEnd, windowStart + random.int(5, 240) * MS_PER_MINUTE)
        : env.transfers.sampleTimestampInRange(random, windowStart + MS_PER_DAY, windowEnd)
      const reference = fillTemplate(
        inboundPicker.pick(random).template,
        referenceValues(initiatedAt),
      )
      const fromEmployer = random.chance(0.7)
      const sender = people.name(random)
      inboundCents += amountCents
      add({
        type: "inbound",
        fromAccount: null,
        toAccount: account,
        counterpartyName: fromEmployer ? employer : `${sender.first} ${sender.last}`,
        counterpartyIban: counterpartyIban(
          random.chance(0.8) ? holder.countryCode : geography.residentCountry(random).code,
        ),
        scheme: router.scheme(random, currency, "inbound"),
        amountCents,
        currency,
        reference:
          initialDeposit && random.chance(0.6)
            ? fillTemplate(pool.initialDepositReference, { name: fullName(holder) })
            : reference,
        initiatedAt,
      })
    }
    const payout = (source: Account, balanceCents: number) => {
      if (source.closedAt === null || balanceCents < minimum) {
        return
      }
      add({
        type: "outbound",
        fromAccount: source,
        toAccount: null,
        counterpartyName: fullName(holder),
        counterpartyIban: counterpartyIban(holder.countryCode),
        scheme: router.scheme(random, currency, "outbound"),
        amountCents: balanceCents,
        currency,
        reference: fillTemplate(pool.closurePayoutReference, { name: fullName(holder) }),
        initiatedAt: source.closedAt - random.int(1, 6) * MS_PER_HOUR,
      })
    }
    payout(account, account.openingCents + inboundCents - outflowCents)
    if (savings) {
      payout(savings, savings.openingCents + savingsInflowCents)
    }
  }

  const failedCount = Math.round(target * failureShare)
  for (let index = 0; index < failedCount && plans.length > 0; index += 1) {
    const plan = random.pick(plans)
    if (plan.windowEnd - plan.windowStart < 2 * MS_PER_DAY) {
      continue
    }
    const account = plan.account
    const payee = payeePicker.pick(random)
    const initiatedAt = env.transfers.sampleTimestampInRange(
      random,
      plan.windowStart + MS_PER_DAY,
      plan.windowEnd,
    )
    const day = dayIndexOf(context.clock, initiatedAt)
    add(
      {
        type: "outbound",
        fromAccount: account,
        toAccount: null,
        counterpartyName: payee.name,
        counterpartyIban: counterpartyIban(account.holder.countryCode),
        scheme: router.scheme(random, account.currency, "outbound"),
        amountCents: env.fx.fromEurCents(
          toCents(random.logNormal(payee.meanAmountEur, 0.5)),
          account.currency,
          day,
        ),
        currency: account.currency,
        reference: fillTemplate(payee.reference, referenceValues(initiatedAt)),
        initiatedAt,
      },
      random.chance(rates.transferFailureShare / failureShare) ? "failed" : "returned",
    )
  }

  sortByTime(transfers, (transfer) => transfer.initiatedAt)
  transfers.forEach((transfer, index) => {
    transfer.id = index + 1
  })
  return transfers
}

export function transfersTable(transfers: readonly Transfer[]): GeneratedTable {
  return defineTable(
    "transfers",
    [
      "transfer_id",
      "transfer_type",
      "from_account_id",
      "to_account_id",
      "counterparty_name",
      "counterparty_iban",
      "scheme",
      "amount",
      "currency",
      "reference",
      "status",
      "initiated_at",
      "completed_at",
    ],
    transfers,
    (transfer): Row => [
      transfer.id,
      transfer.type,
      transfer.fromAccount?.id ?? null,
      transfer.toAccount?.id ?? null,
      transfer.counterpartyName,
      transfer.counterpartyIban,
      transfer.scheme,
      money(transfer.amountCents),
      transfer.currency,
      transfer.reference,
      transfer.status,
      formatTimestamp(transfer.initiatedAt),
      transfer.completedAt === null ? null : formatTimestamp(transfer.completedAt),
    ],
  )
}
