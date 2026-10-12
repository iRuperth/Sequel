import type { Row } from "../../csv"
import type { LoanProduct } from "../../pools"
import { weightedPicker, type Random } from "../../random"
import {
  MS_PER_DAY,
  MS_PER_HOUR,
  addMonthsUtc,
  daysBetween,
  formatDate,
  formatTimestamp,
  parseIsoDate,
  startOfDay,
} from "../../time"
import { fixed, money } from "../format"
import { defineTable, type GeneratedTable } from "../types"
import type { Account, FintechEnvironment, Holder } from "./model"

type LoanStatus = "active" | "delinquent" | "defaulted" | "paid_off"
type RepaymentStatus = "pending" | "paid" | "paid_late" | "partial" | "missed"
type Behaviour = "reliable" | "occasional" | "delinquent"

const GRACE_DAYS = 5
const LATE_THRESHOLD_DAYS = 5

interface Loan {
  sequence: number
  id: number
  holder: Holder
  account: Account
  product: LoanProduct
  principalCents: number
  currency: string
  annualRate: number
  termMonths: number
  installmentCents: number
  status: LoanStatus
  originatedAt: number
  firstDueMs: number
  repayments: Repayment[]
}

interface Repayment {
  installment: number
  dueMs: number
  amountDueCents: number
  amountPaidCents: number
  paidAt: number | null
  daysPastDue: number
  status: RepaymentStatus
}

function annuity(principalCents: number, annualRate: number, termMonths: number): number {
  const monthly = annualRate / 12
  if (monthly === 0) {
    return Math.round(principalCents / termMonths)
  }
  return Math.round((principalCents * monthly) / (1 - Math.pow(1 + monthly, -termMonths)))
}

function paymentTime(random: Random, dueMs: number, daysLate: number): number {
  return (
    dueMs + daysLate * MS_PER_DAY + random.int(7, 21) * MS_PER_HOUR + random.int(0, 3599) * 1000
  )
}

function schedule(
  loan: Loan,
  random: Random,
  behaviour: Behaviour,
  asOfMs: number,
  endMs: number,
  env: FintechEnvironment,
) {
  const rules = env.context.pools.fintech.rates.loanBehaviour
  const monthlyRate = loan.annualRate / 12
  let outstanding = loan.principalCents
  let consecutiveMisses = 0
  const delinquentStart = random.int(rules.delinquentStartRange[0], rules.delinquentStartRange[1])
  const earlyPayoffAt = random.chance(rules.earlyPayoffShare)
    ? random.int(6, Math.max(6, loan.termMonths - 1))
    : 0
  for (let installment = 1; installment <= loan.termMonths; installment += 1) {
    const dueMs = addMonthsUtc(loan.firstDueMs, installment - 1)
    if (dueMs > asOfMs) {
      break
    }
    const interest = Math.round(outstanding * monthlyRate)
    const isFinal = installment === loan.termMonths
    const amountDue = isFinal ? outstanding + interest : loan.installmentCents
    let daysLate: number
    let paidShare = 1
    let missed = false
    if (behaviour === "delinquent" && installment >= delinquentStart) {
      missed = random.chance(0.75)
      daysLate = random.int(20, 60)
    } else if (behaviour === "occasional") {
      missed = random.chance(rules.occasionalMissProbability)
      daysLate = random.chance(rules.occasionalLateProbability)
        ? random.int(6, 45)
        : random.int(-3, 3)
      if (!missed && random.chance(rules.partialPaymentProbability * 4)) {
        paidShare = random.float(0.3, 0.9)
      }
    } else {
      daysLate = random.chance(0.06) ? random.int(4, 9) : random.int(-3, 2)
      if (random.chance(rules.partialPaymentProbability)) {
        paidShare = random.float(0.4, 0.9)
      }
    }
    const repayment: Repayment = {
      installment,
      dueMs,
      amountDueCents: amountDue,
      amountPaidCents: 0,
      paidAt: null,
      daysPastDue: 0,
      status: "missed",
    }
    const paidAt = missed ? null : paymentTime(random, dueMs, daysLate)
    if (paidAt === null || paidAt > endMs) {
      const overdue = Math.max(0, daysBetween(dueMs, asOfMs))
      repayment.daysPastDue = overdue
      repayment.status = overdue <= GRACE_DAYS ? "pending" : "missed"
      if (repayment.status === "pending") {
        loan.repayments.push(repayment)
        break
      }
      consecutiveMisses += 1
    } else {
      consecutiveMisses = 0
      const early = earlyPayoffAt === installment
      repayment.paidAt = paidAt
      repayment.daysPastDue = Math.max(0, daysBetween(dueMs, paidAt))
      repayment.amountPaidCents = early
        ? outstanding + interest
        : Math.max(1, Math.round(amountDue * paidShare))
      repayment.status =
        paidShare < 1 && !early
          ? "partial"
          : repayment.daysPastDue > LATE_THRESHOLD_DAYS
            ? "paid_late"
            : "paid"
      outstanding = Math.max(0, outstanding + interest - repayment.amountPaidCents)
      if (early) {
        outstanding = 0
      }
    }
    loan.repayments.push(repayment)
    if (consecutiveMisses >= rules.defaultAfterConsecutiveMisses) {
      loan.status = "defaulted"
      return
    }
    if (outstanding === 0) {
      loan.status = "paid_off"
      return
    }
  }
  const recent = loan.repayments.slice(-2)
  const delinquent = recent.some(
    (repayment) =>
      repayment.status === "missed" || repayment.status === "partial" || repayment.daysPastDue > 30,
  )
  loan.status = delinquent ? "delinquent" : "active"
}

export function buildLoanTables(
  env: FintechEnvironment,
  holders: readonly Holder[],
): GeneratedTable[] {
  const { context } = env
  const pool = context.pools.fintech
  const rules = pool.rates.loanBehaviour
  const random = context.random("loans")
  const productPicker = weightedPicker(pool.loanProducts)
  const { endMs } = context.clock
  const asOfMs = parseIsoDate(context.clock.asOfDate)
  const eligible = holders.filter(
    (holder) => holder.status === "active" && endMs - holder.onboardedAt > 60 * MS_PER_DAY,
  )
  const count = Math.min(
    context.scaled(context.pools.volumes.fintech.loans, 5),
    eligible.length * 2,
  )
  const loans: Loan[] = []
  const loanCountByHolder = new Map<Holder, number>()
  let attempts = 0
  while (loans.length < count && attempts < count * 10 && eligible.length > 0) {
    attempts += 1
    const holder = random.pick(eligible)
    const existing = loanCountByHolder.get(holder) ?? 0
    if (existing >= 2 || (existing === 1 && random.chance(0.8))) {
      continue
    }
    const account = holder.accounts.find((candidate) => candidate.type === "current")
    if (!account) {
      continue
    }
    const from = holder.onboardedAt + 30 * MS_PER_DAY
    const to = endMs - 20 * MS_PER_DAY
    if (to <= from) {
      continue
    }
    const originatedAt = env.transfers.sampleTimestampInRange(random, from, to)
    const product = productPicker.pick(random)
    const [minPrincipal, maxPrincipal] = product.principalRange
    const principal =
      Math.round(Math.exp(random.float(Math.log(minPrincipal), Math.log(maxPrincipal))) / 100) * 100
    const terms = product.terms
    const termMonths = terms[
      Math.min(terms.length - 1, Math.floor(Math.pow(random.next(), 1.4) * terms.length))
    ] as number
    const [minRate, maxRate] = product.rateRange
    const riskUplift =
      holder.riskRating === "high" ? 0.025 : holder.riskRating === "medium" ? 0.01 : 0
    const annualRate = Number(
      Math.min(0.2499, random.float(minRate, maxRate) + riskUplift).toFixed(4),
    )
    const principalCents = env.fx.fromEurCents(principal * 100, account.currency, 0)
    const firstDueMs = startOfDay(addMonthsUtc(startOfDay(originatedAt), 1))
    loans.push({
      sequence: loans.length,
      id: 0,
      holder,
      account,
      product,
      principalCents,
      currency: account.currency,
      annualRate,
      termMonths,
      installmentCents: annuity(principalCents, annualRate, termMonths),
      status: "active",
      originatedAt,
      firstDueMs,
      repayments: [],
    })
    loanCountByHolder.set(holder, existing + 1)
  }
  loans.sort(
    (left, right) => left.originatedAt - right.originatedAt || left.sequence - right.sequence,
  )
  loans.forEach((loan, index) => {
    loan.id = index + 1
    const roll = random.next()
    const behaviour: Behaviour =
      roll < rules.reliableShare
        ? "reliable"
        : roll < rules.reliableShare + rules.occasionalShare
          ? "occasional"
          : "delinquent"
    schedule(loan, random, behaviour, asOfMs, endMs, env)
  })

  const repayments = loans.flatMap((loan) =>
    loan.repayments.map((repayment) => ({ loan, repayment })),
  )
  return [
    defineTable(
      "loans",
      [
        "loan_id",
        "holder_id",
        "account_id",
        "product",
        "principal",
        "currency",
        "annual_rate",
        "term_months",
        "monthly_installment",
        "status",
        "originated_at",
        "first_due_date",
      ],
      loans,
      (loan): Row => [
        loan.id,
        loan.holder.id,
        loan.account.id,
        loan.product.value,
        money(loan.principalCents),
        loan.currency,
        fixed(loan.annualRate, 4),
        loan.termMonths,
        money(loan.installmentCents),
        loan.status,
        formatTimestamp(loan.originatedAt),
        formatDate(loan.firstDueMs),
      ],
    ),
    defineTable(
      "loan_repayments",
      [
        "repayment_id",
        "loan_id",
        "installment_number",
        "due_date",
        "amount_due",
        "amount_paid",
        "paid_at",
        "days_past_due",
        "status",
      ],
      repayments,
      ({ loan, repayment }, index): Row => [
        index + 1,
        loan.id,
        repayment.installment,
        formatDate(repayment.dueMs),
        money(repayment.amountDueCents),
        money(repayment.amountPaidCents),
        repayment.paidAt === null ? null : formatTimestamp(repayment.paidAt),
        repayment.daysPastDue,
        repayment.status,
      ],
    ),
  ]
}
