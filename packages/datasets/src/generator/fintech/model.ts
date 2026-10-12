import type { MerchantCategory } from "../../pools"
import type { FxTable } from "../fx"
import type { Geography, PeopleFactory, PersonName } from "../people"
import type { TimeSampler } from "../seasonality"
import type { GeneratorContext } from "../types"

export type HolderStatus = "active" | "suspended" | "closed"
export type AccountType = "current" | "savings" | "business"
export type AccountStatus = "active" | "frozen" | "closed"
export type CardStatus = "active" | "blocked" | "expired" | "cancelled"
export type TransactionType = "purchase" | "refund" | "atm_withdrawal"
export type TransactionStatus = "authorized" | "settled" | "declined" | "reversed"
export type TransferType = "inbound" | "outbound" | "internal"
export type TransferStatus = "pending" | "completed" | "failed" | "returned"

export interface Holder {
  id: number
  customerNumber: string
  name: PersonName
  email: string
  phone: string | null
  dateOfBirthMs: number
  countryCode: string
  city: string
  currency: string
  plan: string
  riskRating: string
  status: HolderStatus
  onboardedAt: number
  closedAt: number | null
  spendPropensity: number
  travelPropensity: number
  accounts: Account[]
}

export interface Account {
  id: number
  holder: Holder
  iban: string
  type: AccountType
  currency: string
  status: AccountStatus
  overdraftCents: number
  openedAt: number
  closedAt: number | null
  balanceCents: number
  openingCents: number
  cardOutflowCents: number
}

export interface Card {
  id: number
  account: Account
  holder: Holder
  network: string
  formFactor: "physical" | "virtual"
  last4: string
  currency: string
  dailyLimitCents: number
  status: CardStatus
  issuedAt: number
  expiresOnMs: number
  deactivatedAt: number | null
  activityWeight: number
}

export interface Merchant {
  id: number
  name: string
  category: MerchantCategory
  countryCode: string
  city: string | null
  currency: string
  online: boolean
  createdAt: number
  weight: number
  descriptorBase: string
}

export interface CardTransaction {
  id: number
  sequence: number
  card: Card
  merchant: Merchant
  merchantMapped: boolean
  descriptor: string
  type: TransactionType
  channel: string
  amountCents: number
  currency: string
  billingCents: number
  billingCurrency: string
  status: TransactionStatus
  declineReason: string | null
  createdAt: number
  settledAt: number | null
  duplicateOf: CardTransaction | null
  hasAlert: boolean
}

export interface Transfer {
  id: number
  sequence: number
  type: TransferType
  fromAccount: Account | null
  toAccount: Account | null
  counterpartyName: string | null
  counterpartyIban: string | null
  scheme: string
  amountCents: number
  currency: string
  reference: string | null
  status: TransferStatus
  initiatedAt: number
  completedAt: number | null
}

export interface FintechEnvironment {
  context: GeneratorContext
  geography: Geography
  people: PeopleFactory
  fx: FxTable
  onboarding: TimeSampler
  cardPayments: TimeSampler
  transfers: TimeSampler
}

export function fullName(holder: Holder): string {
  return `${holder.name.first} ${holder.name.last}`
}

export function sortByTime<T extends { sequence: number }>(
  items: T[],
  time: (item: T) => number,
): T[] {
  return items.sort((left, right) => time(left) - time(right) || left.sequence - right.sequence)
}
