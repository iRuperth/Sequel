import type { Row } from "../../csv"
import type { FintechPool } from "../../pools"
import { formatTimestamp } from "../../time"
import { money } from "../format"
import type { GeneratedTable } from "../types"
import type { Account, CardTransaction, Transfer } from "./model"

const SOURCE_OPENING = 0
const SOURCE_CARD = 1
const SOURCE_TRANSFER = 2
const SOURCE_TYPES = ["opening_balance", "card_transaction", "transfer"] as const
const COLUMNS = [
  "posting_id",
  "journal_id",
  "account_id",
  "gl_account",
  "entry_side",
  "amount",
  "currency",
  "source_type",
  "source_id",
  "posted_at",
] as const

export interface Journal {
  postedAt: number
  sourceOrder: number
  sourceId: number
  amountCents: number
  currency: string
  debitAccount: Account | null
  debitGl: string
  creditAccount: Account | null
  creditGl: string
}

export function buildJournals(
  pool: FintechPool,
  openingAt: number,
  accounts: readonly Account[],
  transactions: readonly CardTransaction[],
  transfers: readonly Transfer[],
): Journal[] {
  const gl = pool.glAccounts
  const journals: Journal[] = []
  for (const account of accounts) {
    if (account.openingCents <= 0) {
      continue
    }
    journals.push({
      postedAt: openingAt,
      sourceOrder: SOURCE_OPENING,
      sourceId: account.id,
      amountCents: account.openingCents,
      currency: account.currency,
      debitAccount: null,
      debitGl: gl.balanceMigration,
      creditAccount: account,
      creditGl: gl.customerDeposits,
    })
  }
  for (const transaction of transactions) {
    if (transaction.status !== "settled" || transaction.settledAt === null) {
      continue
    }
    const account = transaction.card.account
    const schemeGl =
      transaction.type === "atm_withdrawal" ? gl.atmNetworkSettlement : gl.cardSchemeSettlement
    const refund = transaction.type === "refund"
    journals.push({
      postedAt: transaction.settledAt,
      sourceOrder: SOURCE_CARD,
      sourceId: transaction.id,
      amountCents: transaction.billingCents,
      currency: transaction.billingCurrency,
      debitAccount: refund ? null : account,
      debitGl: refund ? schemeGl : gl.customerDeposits,
      creditAccount: refund ? account : null,
      creditGl: refund ? gl.customerDeposits : schemeGl,
    })
  }
  for (const transfer of transfers) {
    if (transfer.status !== "completed" || transfer.completedAt === null) {
      continue
    }
    journals.push({
      postedAt: transfer.completedAt,
      sourceOrder: SOURCE_TRANSFER,
      sourceId: transfer.id,
      amountCents: transfer.amountCents,
      currency: transfer.currency,
      debitAccount: transfer.fromAccount,
      debitGl: transfer.fromAccount ? gl.customerDeposits : gl.paymentClearing,
      creditAccount: transfer.toAccount,
      creditGl: transfer.toAccount ? gl.customerDeposits : gl.paymentClearing,
    })
  }
  journals.sort(
    (left, right) =>
      left.postedAt - right.postedAt ||
      left.sourceOrder - right.sourceOrder ||
      left.sourceId - right.sourceId,
  )
  for (const journal of journals) {
    if (journal.debitAccount) {
      journal.debitAccount.balanceCents -= journal.amountCents
    }
    if (journal.creditAccount) {
      journal.creditAccount.balanceCents += journal.amountCents
    }
  }
  return journals
}

export function ledgerPostingsTable(journals: readonly Journal[]): GeneratedTable {
  return {
    name: "ledger_postings",
    columns: COLUMNS,
    rowCount: journals.length * 2,
    *rows() {
      for (let index = 0; index < journals.length; index += 1) {
        const journal = journals[index] as Journal
        const journalId = index + 1
        const source = SOURCE_TYPES[journal.sourceOrder] ?? SOURCE_TYPES[SOURCE_TRANSFER]
        const amount = money(journal.amountCents)
        const postedAt = formatTimestamp(journal.postedAt)
        const debit: Row = [
          journalId * 2 - 1,
          journalId,
          journal.debitAccount?.id ?? null,
          journal.debitGl,
          "debit",
          amount,
          journal.currency,
          source,
          journal.sourceId,
          postedAt,
        ]
        const credit: Row = [
          journalId * 2,
          journalId,
          journal.creditAccount?.id ?? null,
          journal.creditGl,
          "credit",
          amount,
          journal.currency,
          source,
          journal.sourceId,
          postedAt,
        ]
        yield debit
        yield credit
      }
    },
  }
}
