import type { Row } from "../../csv"
import { weightedPicker } from "../../random"
import {
  MS_PER_DAY,
  MS_PER_HOUR,
  MS_PER_MINUTE,
  addMonthsUtc,
  formatDate,
  formatTimestamp,
  startOfDay,
} from "../../time"
import { fixed, money, padNumber, toCents } from "../format"
import { defineTable, type GeneratedTable } from "../types"
import type { Account, AccountType, Card, FintechEnvironment, Holder } from "./model"

const YEAR_MS = 365.25 * MS_PER_DAY
const PLAN_SPEND_FACTOR: Record<string, number> = { standard: 1, plus: 1.3, premium: 1.8 }

interface KycCheck {
  sequence: number
  holderId: number
  checkType: string
  provider: string
  status: string
  matchScore: number | null
  payload: string
  submittedAt: number
  completedAt: number | null
}

export function buildHolders(env: FintechEnvironment): Holder[] {
  const { context, geography, people } = env
  const pool = context.pools.fintech
  const random = context.random("account_holders")
  const planPicker = weightedPicker(pool.plans)
  const riskPicker = weightedPicker(pool.riskRatings)
  const count = context.scaled(context.pools.volumes.fintech.accountHolders, 20)
  const { startMs } = context.clock
  const preWindowMs = addMonthsUtc(startMs, -pool.rates.preWindowMonths)
  const holders: Holder[] = []
  for (let index = 0; index < count; index += 1) {
    const country = geography.residentCountry(random)
    const name = people.name(random)
    const onboardedAt = random.chance(pool.rates.preWindowHolderShare)
      ? startMs -
        Math.floor((Math.pow(random.next(), 1.6) * (startMs - preWindowMs)) / 1000) * 1000 -
        1000
      : env.onboarding.sampleTimestamp(random)
    const ageYears = Math.min(82, 18 + random.exponential(13))
    const plan = planPicker.pick(random).value
    holders.push({
      id: 0,
      customerNumber: "",
      name,
      email: people.personalEmail(random, name),
      phone: random.chance(0.93) ? geography.phoneNumber(random, country.code) : null,
      dateOfBirthMs: startOfDay(onboardedAt - ageYears * YEAR_MS),
      countryCode: country.code,
      city: geography.city(random, country.code),
      currency: country.currency,
      plan,
      riskRating: riskPicker.pick(random).value,
      status: "active",
      onboardedAt,
      closedAt: null,
      spendPropensity: random.logNormal(1, 0.85) * (PLAN_SPEND_FACTOR[plan] ?? 1),
      travelPropensity:
        plan === "premium" ? 2.2 : plan === "plus" ? 1.4 : random.chance(0.15) ? 1.5 : 0.7,
      accounts: [],
    })
  }
  holders.sort((left, right) => left.onboardedAt - right.onboardedAt)
  const endMs = context.clock.endMs
  holders.forEach((holder, index) => {
    holder.id = index + 1
    holder.customerNumber = `${pool.customerNumberPrefix}${((holder.id * 7919 + 1000003) % 90000000) + 10000000}`
    const roll = random.next()
    const closeFrom = Math.max(holder.onboardedAt + 30 * MS_PER_DAY, startMs + 7 * MS_PER_DAY)
    const room = endMs - 30 * MS_PER_DAY - closeFrom
    if (roll < pool.rates.holderClosedShare && room > MS_PER_DAY) {
      holder.status = "closed"
      holder.closedAt = closeFrom + Math.floor((random.next() * room) / 1000) * 1000
    } else if (roll < pool.rates.holderClosedShare + pool.rates.holderSuspendedShare) {
      holder.status = "suspended"
    }
  })
  return holders
}

export function holdersTable(holders: readonly Holder[]): GeneratedTable {
  return defineTable(
    "account_holders",
    [
      "holder_id",
      "customer_number",
      "first_name",
      "last_name",
      "email",
      "phone_number",
      "date_of_birth",
      "country_code",
      "city",
      "plan",
      "risk_rating",
      "status",
      "onboarded_at",
      "closed_at",
    ],
    holders,
    (holder): Row => [
      holder.id,
      holder.customerNumber,
      holder.name.first,
      holder.name.last,
      holder.email,
      holder.phone,
      formatDate(holder.dateOfBirthMs),
      holder.countryCode,
      holder.city,
      holder.plan,
      holder.riskRating,
      holder.status,
      formatTimestamp(holder.onboardedAt),
      holder.closedAt === null ? null : formatTimestamp(holder.closedAt),
    ],
  )
}

export function buildKycTable(env: FintechEnvironment, holders: readonly Holder[]): GeneratedTable {
  const { context } = env
  const pool = context.pools.fintech
  const random = context.random("kyc_checks")
  const providerPicker = weightedPicker(pool.kycProviders)
  const identityPicker = weightedPicker(pool.identityDocuments)
  const addressPicker = weightedPicker(pool.addressDocuments)
  const { endMs } = context.clock
  const checks: KycCheck[] = []
  let sequence = 0

  const push = (check: Omit<KycCheck, "sequence">) => {
    const pendingWindow = endMs - check.submittedAt < 2 * MS_PER_DAY
    const finalCheck =
      check.completedAt !== null &&
      (check.completedAt > endMs || (pendingWindow && random.chance(0.35)))
        ? { ...check, status: random.chance(0.5) ? "pending" : "manual_review", completedAt: null }
        : check
    checks.push({ ...finalCheck, sequence: sequence++ })
  }

  for (const holder of holders) {
    const provider = providerPicker.pick(random).value
    const identitySubmitted = holder.onboardedAt - random.int(8, 90) * MS_PER_MINUTE
    const failedFirst = random.chance(pool.rates.kycFailureShare)
    const documentType = identityPicker.pick(random).value
    const issuingCountry = random.chance(0.94)
      ? holder.countryCode
      : env.geography.travelCountry(random).code
    if (failedFirst) {
      const failedAt = identitySubmitted - random.int(30, 600) * MS_PER_MINUTE
      const liveness = random.float(0.31, 0.68)
      push({
        holderId: holder.id,
        checkType: "identity_document",
        provider,
        status: "failed",
        matchScore: Math.round(liveness * 10000) / 100,
        payload: JSON.stringify({
          document_type: documentType,
          issuing_country: issuingCountry,
          liveness_score: Number(liveness.toFixed(2)),
          face_match: false,
          failure_reason: random.pick(pool.kycFailureReasons),
        }),
        submittedAt: failedAt,
        completedAt: failedAt + random.int(1, 12) * MS_PER_MINUTE,
      })
    }
    const liveness = random.float(0.82, 0.995)
    const manual = random.chance(pool.rates.kycManualReviewShare)
    push({
      holderId: holder.id,
      checkType: "identity_document",
      provider,
      status: "passed",
      matchScore: Math.round(liveness * 10000) / 100,
      payload: JSON.stringify({
        document_type: documentType,
        issuing_country: issuingCountry,
        document_expiry_year: new Date(holder.onboardedAt).getUTCFullYear() + random.int(1, 9),
        liveness_score: Number(liveness.toFixed(2)),
        face_match: true,
        reviewed_manually: manual,
      }),
      submittedAt: identitySubmitted,
      completedAt: Math.max(
        identitySubmitted + MS_PER_MINUTE,
        Math.min(
          holder.onboardedAt - MS_PER_MINUTE,
          identitySubmitted + (manual ? random.int(30, 300) : random.int(1, 6)) * MS_PER_MINUTE,
        ),
      ),
    })
    const screeningTimes = [holder.onboardedAt - random.int(1, 6) * MS_PER_MINUTE]
    let next = holder.onboardedAt + 365 * MS_PER_DAY
    const screeningEnd = holder.closedAt ?? endMs
    while (next < screeningEnd) {
      const submittedAt = next + random.int(0, 72) * MS_PER_HOUR
      if (submittedAt < screeningEnd) {
        screeningTimes.push(submittedAt)
      }
      next += 365 * MS_PER_DAY
    }
    screeningTimes.forEach((submittedAt, screeningIndex) => {
      const potentialMatch = random.chance(0.004)
      push({
        holderId: holder.id,
        checkType: "sanctions_screening",
        provider,
        status: "passed",
        matchScore: potentialMatch
          ? Math.round(random.float(82, 97) * 100) / 100
          : Math.round(random.float(0, 35) * 100) / 100,
        payload: JSON.stringify({
          screening_type: screeningIndex === 0 ? "onboarding" : "periodic",
          lists_checked: pool.sanctionLists,
          potential_matches: potentialMatch ? random.int(1, 2) : 0,
          cleared_by_analyst: potentialMatch,
        }),
        submittedAt,
        completedAt:
          submittedAt +
          (potentialMatch ? random.int(4, 72) * MS_PER_HOUR : random.int(2, 40) * 1000),
      })
    })
    push({
      holderId: holder.id,
      checkType: "pep_screening",
      provider,
      status: "passed",
      matchScore: null,
      payload: JSON.stringify({
        potential_matches: 0,
        relatives_and_associates_checked: random.chance(0.7),
      }),
      submittedAt: holder.onboardedAt - random.int(1, 6) * MS_PER_MINUTE,
      completedAt: holder.onboardedAt + random.int(5, 120) * 1000,
    })
    if (random.chance(pool.rates.proofOfAddressShare)) {
      const submittedAt = holder.onboardedAt + random.int(1, 14 * 24) * MS_PER_HOUR
      if (submittedAt < endMs) {
        const roll = random.next()
        const status = roll < 0.03 ? "failed" : "passed"
        push({
          holderId: holder.id,
          checkType: "proof_of_address",
          provider,
          status,
          matchScore: null,
          payload: JSON.stringify({
            document_type: addressPicker.pick(random).value,
            document_age_days: random.int(3, status === "failed" ? 240 : 85),
            name_match: status === "passed",
            address_match:
              status === "passed" ? random.pick(["exact", "exact", "partial"]) : "none",
          }),
          submittedAt,
          completedAt: submittedAt + random.int(10, 2880) * MS_PER_MINUTE,
        })
      }
    }
  }
  checks.sort(
    (left, right) => left.submittedAt - right.submittedAt || left.sequence - right.sequence,
  )
  return defineTable(
    "kyc_checks",
    [
      "kyc_check_id",
      "holder_id",
      "check_type",
      "provider",
      "status",
      "match_score",
      "payload",
      "submitted_at",
      "completed_at",
    ],
    checks,
    (check, index): Row => [
      index + 1,
      check.holderId,
      check.checkType,
      check.provider,
      check.status,
      check.matchScore === null ? null : fixed(check.matchScore, 2),
      check.payload,
      formatTimestamp(check.submittedAt),
      check.completedAt === null ? null : formatTimestamp(check.completedAt),
    ],
  )
}

export function buildAccounts(env: FintechEnvironment, holders: readonly Holder[]): Account[] {
  const { context } = env
  const pool = context.pools.fintech
  const random = context.random("accounts")
  const overdraftPicker = weightedPicker(pool.overdraftLimits)
  const { startMs, endMs } = context.clock
  const accounts: Account[] = []
  const open = (holder: Holder, type: AccountType, openedAt: number) => {
    const account: Account = {
      id: 0,
      holder,
      iban: "",
      type,
      currency: holder.currency,
      status: "active",
      overdraftCents:
        type === "current"
          ? overdraftPicker.pick(random).value * 100
          : type === "business"
            ? random.pick([0, 100000, 250000, 500000])
            : 0,
      openedAt,
      closedAt: null,
      balanceCents: 0,
      openingCents: 0,
      cardOutflowCents: 0,
    }
    if (holder.status === "closed" && holder.closedAt !== null) {
      account.status = "closed"
      account.closedAt = holder.closedAt
    } else if (holder.status === "suspended") {
      account.status = "frozen"
    } else if (random.chance(pool.rates.accountFrozenShare)) {
      account.status = "frozen"
    }
    if (openedAt < startMs) {
      const meanEur = type === "savings" ? 3200 : type === "business" ? 6500 : 1400
      account.openingCents = env.fx.fromEurCents(
        toCents(random.logNormal(meanEur, 1.1)),
        account.currency,
        0,
      )
    }
    holder.accounts.push(account)
    accounts.push(account)
  }
  for (const holder of holders) {
    const limit = holder.closedAt ?? endMs
    open(holder, "current", Math.min(endMs, holder.onboardedAt + random.int(1, 20) * MS_PER_MINUTE))
    if (random.chance(pool.rates.savingsAccountShare)) {
      const openedAt =
        holder.onboardedAt + Math.floor(random.exponential(45 * MS_PER_DAY)) + MS_PER_HOUR
      if (openedAt < limit - MS_PER_DAY) {
        open(holder, "savings", openedAt)
      }
    }
    if (random.chance(pool.rates.businessAccountShare)) {
      const openedAt =
        holder.onboardedAt + Math.floor(random.exponential(70 * MS_PER_DAY)) + MS_PER_HOUR
      if (openedAt < limit - 7 * MS_PER_DAY) {
        open(holder, "business", openedAt)
      }
    }
  }
  accounts.sort((left, right) => left.openedAt - right.openedAt)
  accounts.forEach((account, index) => {
    account.id = index + 1
    account.iban = `${account.holder.countryCode}${padNumber(random.int(2, 98), 2)}${pool.bankCode}${padNumber(
      40000000 + account.id * 37,
      10,
    )}`
  })
  return accounts
}

export function accountsTable(accounts: readonly Account[]): GeneratedTable {
  return defineTable(
    "accounts",
    [
      "account_id",
      "holder_id",
      "iban",
      "account_type",
      "currency",
      "status",
      "overdraft_limit",
      "current_balance",
      "opened_at",
      "closed_at",
    ],
    accounts,
    (account): Row => [
      account.id,
      account.holder.id,
      account.iban,
      account.type,
      account.currency,
      account.status,
      money(account.overdraftCents),
      money(account.balanceCents),
      formatTimestamp(account.openedAt),
      account.closedAt === null ? null : formatTimestamp(account.closedAt),
    ],
  )
}

export function buildCards(env: FintechEnvironment, accounts: readonly Account[]): Card[] {
  const { context } = env
  const pool = context.pools.fintech
  const random = context.random("cards")
  const networkPicker = weightedPicker(pool.cardNetworks)
  const endMs = context.clock.endMs
  const cards: Card[] = []
  const limits = pool.dailyLimits

  const issue = (
    account: Account,
    formFactor: "physical" | "virtual",
    issuedAt: number,
    weight: number,
  ): Card | null => {
    if (issuedAt >= (account.closedAt ?? endMs) - MS_PER_HOUR) {
      return null
    }
    const holder = account.holder
    const dailyLimit =
      account.type === "business"
        ? limits.business
        : formFactor === "virtual"
          ? limits.virtual
          : holder.plan === "premium"
            ? limits.premium
            : limits.physical
    const card: Card = {
      id: 0,
      account,
      holder,
      network: networkPicker.pick(random).value,
      formFactor,
      last4: random.digits(4),
      currency: account.currency,
      dailyLimitCents: dailyLimit * 100,
      status: "active",
      issuedAt,
      expiresOnMs: startOfDay(addMonthsUtc(issuedAt, 36)),
      deactivatedAt: null,
      activityWeight: random.chance(0.07) ? 0 : weight,
    }
    if (account.closedAt !== null) {
      card.status = "cancelled"
      card.deactivatedAt = account.closedAt
    } else if (account.status === "frozen") {
      card.status = "blocked"
      card.deactivatedAt = issuedAt + Math.floor(random.next() * (endMs - issuedAt))
    }
    cards.push(card)
    if (card.expiresOnMs < endMs && card.status === "active") {
      card.status = "expired"
      card.deactivatedAt = card.expiresOnMs
      issue(account, formFactor, card.expiresOnMs - random.int(10, 35) * MS_PER_DAY, weight)
    }
    return card
  }

  for (const account of accounts) {
    if (account.type === "savings") {
      continue
    }
    const propensity = account.holder.spendPropensity
    const physicalCount = account.type === "business" ? 1 + random.poisson(1.1) : 1
    for (let index = 0; index < physicalCount; index += 1) {
      const issuedAt =
        account.openedAt +
        (index === 0 ? random.int(20, 96) * MS_PER_HOUR : random.int(2, 120) * MS_PER_DAY)
      const weight = account.type === "business" ? propensity * 1.6 : propensity
      const card = issue(account, "physical", issuedAt, weight)
      if (card && card.status === "active" && random.chance(pool.rates.cardReplacementShare)) {
        const window = endMs - issuedAt
        if (window > 60 * MS_PER_DAY) {
          const cancelledAt =
            issuedAt + 30 * MS_PER_DAY + Math.floor(random.next() * (window - 45 * MS_PER_DAY))
          card.status = "cancelled"
          card.deactivatedAt = cancelledAt
          issue(account, "physical", cancelledAt + random.int(2, 72) * MS_PER_HOUR, weight)
        }
      } else if (card && card.status === "active" && random.chance(0.008)) {
        card.status = "blocked"
        card.deactivatedAt = issuedAt + Math.floor(random.next() * (endMs - issuedAt))
      }
    }
    const virtualShare = account.type === "business" ? 0.75 : pool.rates.virtualCardShare
    if (random.chance(virtualShare)) {
      const issuedAt = account.openedAt + Math.floor(random.next() * (endMs - account.openedAt))
      issue(account, "virtual", issuedAt, propensity * 0.35)
    }
  }
  cards.sort((left, right) => left.issuedAt - right.issuedAt)
  cards.forEach((card, index) => {
    card.id = index + 1
  })
  return cards
}

export function cardsTable(cards: readonly Card[]): GeneratedTable {
  return defineTable(
    "cards",
    [
      "card_id",
      "account_id",
      "holder_id",
      "network",
      "form_factor",
      "pan_last4",
      "currency",
      "daily_limit",
      "status",
      "issued_at",
      "expires_on",
      "deactivated_at",
    ],
    cards,
    (card): Row => [
      card.id,
      card.account.id,
      card.holder.id,
      card.network,
      card.formFactor,
      card.last4,
      card.currency,
      money(card.dailyLimitCents),
      card.status,
      formatTimestamp(card.issuedAt),
      formatDate(card.expiresOnMs),
      card.deactivatedAt === null ? null : formatTimestamp(card.deactivatedAt),
    ],
  )
}
