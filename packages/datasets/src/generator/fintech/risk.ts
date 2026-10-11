import type { Row } from "../../csv"
import { weightedPicker } from "../../random"
import { MS_PER_DAY, MS_PER_HOUR, formatTimestamp } from "../../time"
import { fixed, money, slugify } from "../format"
import { defineTable, type GeneratedTable } from "../types"
import { sortByTime, type CardTransaction, type FintechEnvironment } from "./model"

const LARGE_PURCHASE_EUR_CENTS = 30000
const RECENT_ALERT_WINDOW_MS = 5 * MS_PER_DAY

type AlertStatus = "open" | "investigating" | "confirmed_fraud" | "false_positive"
type DisputeStatus = "open" | "under_review" | "won" | "lost" | "withdrawn"

export interface FraudAlert {
  sequence: number
  transaction: CardTransaction
  ruleCode: string
  ruleName: string
  score: number
  severity: string
  status: AlertStatus
  analyst: string | null
  createdAt: number
  resolvedAt: number | null
}

interface Dispute {
  sequence: number
  transaction: CardTransaction
  reason: string
  networkReasonCode: string
  amountCents: number
  currency: string
  status: DisputeStatus
  openedAt: number
  resolvedAt: number | null
}

function severityFor(score: number): string {
  if (score >= 90) {
    return "critical"
  }
  if (score >= 75) {
    return "high"
  }
  if (score >= 60) {
    return "medium"
  }
  return "low"
}

function riskOf(transaction: CardTransaction): number {
  const category = transaction.merchant.category
  let risk = 1
  if (category.highRisk) {
    risk *= 3
  }
  if (transaction.currency !== transaction.card.currency) {
    risk *= 2.5
  }
  if (transaction.merchant.online) {
    risk *= 1.5
  }
  if (transaction.card.holder.riskRating === "high") {
    risk *= 2
  }
  if (transaction.billingCents > LARGE_PURCHASE_EUR_CENTS) {
    risk *= 2.5
  }
  return risk
}

export function buildFraudAlerts(
  env: FintechEnvironment,
  transactions: readonly CardTransaction[],
): FraudAlert[] {
  const { context, people } = env
  const pool = context.pools.fintech
  const random = context.random("fraud_alerts")
  const rulePicker = weightedPicker(pool.fraudRules)
  const endMs = context.clock.endMs
  const analysts = Array.from({ length: pool.analystCount }, () => {
    const name = people.name(random)
    return `${slugify(name.first)}.${slugify(name.last)}`
  })
  const target = context.scaled(context.pools.volumes.fintech.fraudAlerts, 10)
  const mandatory = transactions.filter(
    (transaction) =>
      transaction.status === "declined" && transaction.declineReason === pool.fraudDeclineReason,
  )
  const candidates = transactions.filter(
    (transaction) => transaction.type === "purchase" && transaction.status !== "declined",
  )
  const totalRisk = candidates.reduce((sum, transaction) => sum + riskOf(transaction), 0)
  const remaining = Math.max(0, target - mandatory.length)
  const factor = totalRisk > 0 ? remaining / totalRisk : 0
  const selected = [
    ...mandatory.map((transaction) => ({ transaction, mandatory: true })),
    ...candidates
      .filter((transaction) => random.chance(Math.min(1, riskOf(transaction) * factor)))
      .map((transaction) => ({ transaction, mandatory: false })),
  ]

  const alerts: FraudAlert[] = []
  let sequence = 0
  for (const { transaction, mandatory: isMandatory } of selected) {
    const rule = rulePicker.pick(random)
    const score = isMandatory
      ? random.float(72, 99.5)
      : Math.min(99, random.float(40, 70) + Math.log(riskOf(transaction)) * 6)
    const delay = random.chance(0.75) ? random.int(2, 90) * 1000 : random.int(1, 8) * MS_PER_HOUR
    const createdAt = Math.min(endMs, transaction.createdAt + delay)
    let status: AlertStatus
    let resolvedAt: number | null = null
    if (endMs - createdAt < RECENT_ALERT_WINDOW_MS) {
      status = random.chance(0.6) ? "open" : "investigating"
    } else {
      const confirmed = random.chance(isMandatory ? 0.38 : 0.16)
      status = confirmed ? "confirmed_fraud" : "false_positive"
      resolvedAt = createdAt + MS_PER_HOUR + Math.floor(random.exponential(20 * MS_PER_HOUR))
      if (resolvedAt > endMs) {
        status = "investigating"
        resolvedAt = null
      }
    }
    transaction.hasAlert = true
    alerts.push({
      sequence: sequence++,
      transaction,
      ruleCode: rule.code,
      ruleName: rule.name,
      score: Math.round(score * 100) / 100,
      severity: severityFor(score),
      status,
      analyst: status === "open" && random.chance(0.5) ? null : random.pick(analysts),
      createdAt,
      resolvedAt,
    })
  }
  return sortByTime(alerts, (alert) => alert.createdAt)
}

export function fraudAlertsTable(alerts: readonly FraudAlert[]): GeneratedTable {
  return defineTable(
    "fraud_alerts",
    [
      "alert_id",
      "transaction_id",
      "card_id",
      "rule_code",
      "rule_name",
      "risk_score",
      "severity",
      "status",
      "assigned_analyst",
      "created_at",
      "resolved_at",
    ],
    alerts,
    (alert, index): Row => [
      index + 1,
      alert.transaction.id,
      alert.transaction.card.id,
      alert.ruleCode,
      alert.ruleName,
      fixed(alert.score, 2),
      alert.severity,
      alert.status,
      alert.analyst,
      formatTimestamp(alert.createdAt),
      alert.resolvedAt === null ? null : formatTimestamp(alert.resolvedAt),
    ],
  )
}

export function buildDisputesTable(
  env: FintechEnvironment,
  transactions: readonly CardTransaction[],
  alerts: readonly FraudAlert[],
): GeneratedTable {
  const { context } = env
  const pool = context.pools.fintech
  const random = context.random("disputes")
  const endMs = context.clock.endMs
  const target = context.scaled(context.pools.volumes.fintech.disputes, 5)
  const reasons = new Map(pool.disputeReasons.map((reason) => [reason.value, reason]))
  const sampledReasons = weightedPicker(pool.disputeReasons.filter((reason) => reason.weight > 0))
  const disputed = new Set<CardTransaction>()
  const disputes: Dispute[] = []
  let sequence = 0

  const open = (
    transaction: CardTransaction,
    reasonValue: string,
    fullAmount: boolean,
  ): boolean => {
    if (disputed.has(transaction) || transaction.status !== "settled") {
      return false
    }
    const openedAt =
      transaction.createdAt + random.int(2, 45) * MS_PER_DAY + random.int(0, 86399) * 1000
    if (openedAt > endMs) {
      return false
    }
    const reason = reasons.get(reasonValue)
    if (!reason) {
      throw new Error(`Unknown dispute reason ${reasonValue}`)
    }
    const age = endMs - openedAt
    let status: DisputeStatus
    let resolvedAt: number | null = null
    if (age < 10 * MS_PER_DAY) {
      status = "open"
    } else if (age < 40 * MS_PER_DAY && random.chance(0.7)) {
      status = random.chance(0.6) ? "under_review" : "open"
    } else {
      const roll = random.next()
      status = roll < 0.55 ? "won" : roll < 0.9 ? "lost" : "withdrawn"
      resolvedAt = openedAt + random.int(10, 75) * MS_PER_DAY
      if (resolvedAt > endMs) {
        status = "under_review"
        resolvedAt = null
      }
    }
    const share = fullAmount ? 1 : random.float(0.1, 0.6)
    disputed.add(transaction)
    disputes.push({
      sequence: sequence++,
      transaction,
      reason: reason.value,
      networkReasonCode: reason.networkReasonCode,
      amountCents: Math.max(1, Math.round(transaction.billingCents * share)),
      currency: transaction.billingCurrency,
      status,
      openedAt,
      resolvedAt,
    })
    return true
  }

  const fraudReason = pool.disputeRoles.fraud
  const duplicateReason = pool.disputeRoles.duplicate
  const partialReason = pool.disputeRoles.partialAmount
  for (const alert of alerts) {
    if (alert.status === "confirmed_fraud" && random.chance(0.9)) {
      open(alert.transaction, fraudReason, true)
    }
  }
  const settledPurchases = transactions.filter(
    (transaction) => transaction.type === "purchase" && transaction.status === "settled",
  )
  const withoutAlert = Math.round(target * pool.rates.fraudDisputeWithoutAlertShare)
  let created = 0
  for (let attempt = 0; created < withoutAlert && attempt < withoutAlert * 20; attempt += 1) {
    const transaction = random.pick(settledPurchases)
    if (
      !transaction.hasAlert &&
      transaction.merchant.online &&
      open(transaction, fraudReason, true)
    ) {
      created += 1
    }
  }
  for (const transaction of transactions) {
    if (transaction.duplicateOf !== null && random.chance(0.45)) {
      open(transaction, duplicateReason, true)
    }
  }
  const remaining = Math.max(0, target - disputes.length)
  created = 0
  for (let attempt = 0; created < remaining && attempt < remaining * 30; attempt += 1) {
    const transaction = random.pick(settledPurchases)
    if (!transaction.merchant.online && random.chance(0.7)) {
      continue
    }
    const reason = sampledReasons.pick(random).value
    if (open(transaction, reason, reason !== partialReason)) {
      created += 1
    }
  }
  sortByTime(disputes, (dispute) => dispute.openedAt)
  return defineTable(
    "disputes",
    [
      "dispute_id",
      "transaction_id",
      "reason",
      "network_reason_code",
      "disputed_amount",
      "currency",
      "status",
      "opened_at",
      "resolved_at",
    ],
    disputes,
    (dispute, index): Row => [
      index + 1,
      dispute.transaction.id,
      dispute.reason,
      dispute.networkReasonCode,
      money(dispute.amountCents),
      dispute.currency,
      dispute.status,
      formatTimestamp(dispute.openedAt),
      dispute.resolvedAt === null ? null : formatTimestamp(dispute.resolvedAt),
    ],
  )
}
