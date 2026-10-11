import type { Row } from "../../csv"
import { dayStartMs, formatDate } from "../../time"
import { fixed } from "../format"
import { FxTable } from "../fx"
import { Geography, PeopleFactory } from "../people"
import { TimeSampler } from "../seasonality"
import type { GeneratedTable, GeneratorContext } from "../types"
import {
  accountsTable,
  buildAccounts,
  buildCards,
  buildHolders,
  buildKycTable,
  cardsTable,
  holdersTable,
} from "./customers"
import { buildJournals, ledgerPostingsTable } from "./ledger"
import { buildLoanTables } from "./loans"
import { buildMerchants, merchantCategoriesTable, merchantsTable } from "./merchants"
import type { FintechEnvironment } from "./model"
import { buildDisputesTable, buildFraudAlerts, fraudAlertsTable } from "./risk"
import { buildTransactions, transactionsTable } from "./transactions"
import { buildTransfers, transfersTable } from "./transfers"

function fxRatesTable(fx: FxTable): GeneratedTable {
  const clock = fx.clock
  const quotes = fx.currencies
  const source = fx.pool.rateSource
  return {
    name: "fx_rates",
    columns: ["rate_date", "base_currency", "quote_currency", "rate", "source"],
    rowCount: clock.dayCount * quotes.length,
    *rows() {
      for (let day = 0; day < clock.dayCount; day += 1) {
        const date = formatDate(dayStartMs(clock, day))
        for (const quote of quotes) {
          const row: Row = [
            date,
            fx.baseCurrency,
            quote.code,
            fixed(fx.rate(quote.code, day), 8),
            source,
          ]
          yield row
        }
      }
    },
  }
}

export function generateFintech(context: GeneratorContext): GeneratedTable[] {
  const profiles = context.pools.seasonality.profiles
  const env: FintechEnvironment = {
    context,
    geography: new Geography(context.pools.geography),
    people: new PeopleFactory(context.pools.people),
    fx: new FxTable(context.clock, context.pools.currencies, context.random("fx_rates")),
    onboarding: new TimeSampler(context.clock, profiles.onboarding),
    cardPayments: new TimeSampler(context.clock, profiles.cardPayments),
    transfers: new TimeSampler(context.clock, profiles.transfers),
  }
  const holders = buildHolders(env)
  const kyc = buildKycTable(env, holders)
  const accounts = buildAccounts(env, holders)
  const cards = buildCards(env, accounts)
  const directory = buildMerchants(env)
  const transactions = buildTransactions(env, cards, directory)
  const alerts = buildFraudAlerts(env, transactions)
  const disputes = buildDisputesTable(env, transactions, alerts)
  const transfers = buildTransfers(env, holders)
  const [loans, repayments] = buildLoanTables(env, holders)
  const journals = buildJournals(
    context.pools.fintech,
    context.clock.startMs,
    accounts,
    transactions,
    transfers,
  )
  if (!loans || !repayments) {
    throw new Error("Loan tables were not generated")
  }
  return [
    holdersTable(holders),
    kyc,
    accountsTable(accounts),
    cardsTable(cards),
    merchantCategoriesTable(context.pools.fintech.merchantCategories),
    merchantsTable(directory.merchants),
    transactionsTable(transactions),
    transfersTable(transfers),
    fxRatesTable(env.fx),
    fraudAlertsTable(alerts),
    disputes,
    loans,
    repayments,
    ledgerPostingsTable(journals),
  ]
}
