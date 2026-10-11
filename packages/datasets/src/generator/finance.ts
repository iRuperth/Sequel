import type { Row } from "../csv"
import type { FinancePool } from "../pools"
import { weightedPicker, type Random } from "../random"
import {
  MS_PER_DAY,
  MS_PER_HOUR,
  dayIndexOf,
  dayStartMs,
  formatDate,
  formatTimestamp,
  parseIsoDate,
  startOfDay,
  yearOf,
} from "../time"
import { fillTemplate, fixed, money, padNumber, toCents } from "./format"
import { FxTable } from "./fx"
import { Geography, PeopleFactory } from "./people"
import { TimeSampler } from "./seasonality"
import { defineTable, type GeneratedTable, type GeneratorContext } from "./types"

type Counterparty = FinancePool["vendors"][number]
type InvoiceType = "payable" | "receivable"

interface CostCenter {
  id: number
  code: string
  name: string
  division: string
  owner: string
  monthlyPayroll: number
  active: boolean
}

interface GlAccount {
  id: number
  code: string
  name: string
  type: string
  subtype: string
  normalBalance: string
  active: boolean
}

interface InvoiceLine {
  lineNumber: number
  account: GlAccount
  description: string
  quantity: number
  unitCents: number
  amountCents: number
  taxRate: number
}

interface Invoice {
  id: number
  sequence: number
  number: string
  type: InvoiceType
  counterparty: Counterparty
  costCenter: CostCenter
  currency: string
  invoiceDate: number
  dueDate: number
  subtotalCents: number
  taxCents: number
  totalCents: number
  status: string
  paidAt: number | null
  paidShare: number
  lines: InvoiceLine[]
}

interface Entry {
  account: GlAccount
  costCenter: CostCenter | null
  description: string
  debitCents: number
  creditCents: number
}

interface Journal {
  sequence: number
  entryDate: number
  postedAt: number
  sourceType: string
  reference: string | null
  entries: Entry[]
}

function monthKey(ms: number): string {
  return formatDate(ms).slice(0, 7)
}

function endOfMonth(year: number, month: number): number {
  return Date.UTC(year, month + 1, 0)
}

export function generateFinance(context: GeneratorContext): GeneratedTable[] {
  const pools = context.pools
  const pool = pools.finance
  const rates = pool.rates
  const geography = new Geography(pools.geography)
  const people = new PeopleFactory(pools.people)
  const { endMs } = context.clock
  const asOfMs = parseIsoDate(context.clock.asOfDate)
  const fx = new FxTable(context.clock, pools.currencies, context.random("exchange_rates"))
  const office = new TimeSampler(context.clock, pools.seasonality.profiles.officeHours)
  const random = context.random("invoices")
  const toEur = (cents: number, currency: string, day: number) =>
    currency === pool.functionalCurrency ? cents : Math.round(cents / fx.rate(currency, day))
  const officeTime = (rng: Random, day: number) => startOfDay(day) + office.timeOfDay(rng)

  const costCenters: CostCenter[] = pool.costCenters.map((center, index) => {
    const owner = people.name(random)
    return {
      id: index + 1,
      code: center.code,
      name: center.name,
      division: center.division,
      owner: `${owner.first} ${owner.last}`,
      monthlyPayroll: center.monthlyPayroll,
      active: center.isActive,
    }
  })
  const centerByCode = new Map(costCenters.map((center) => [center.code, center]))
  const accounts: GlAccount[] = pool.chartOfAccounts.map((account, index) => ({
    id: index + 1,
    code: account.code,
    name: account.name,
    type: account.type,
    subtype: account.subtype,
    normalBalance: account.normalBalance,
    active: account.isActive,
  }))
  const accountByCode = new Map(accounts.map((account) => [account.code, account]))
  const account = (code: string): GlAccount => {
    const found = accountByCode.get(code)
    if (!found) {
      throw new Error(`Unknown GL account ${code}`)
    }
    return found
  }
  const center = (code: string): CostCenter => {
    const found = centerByCode.get(code)
    if (!found) {
      throw new Error(`Unknown cost center ${code}`)
    }
    return found
  }
  const system = pool.systemAccounts

  const vendorPicker = weightedPicker(pool.vendors)
  const clientPicker = weightedPicker(pool.clients)
  const invoiceCount = context.scaled(pools.volumes.finance.invoices, 40)
  const invoices: Invoice[] = []
  for (let index = 0; index < invoiceCount; index += 1) {
    const type: InvoiceType = random.chance(rates.payableShare) ? "payable" : "receivable"
    const counterparty = type === "payable" ? vendorPicker.pick(random) : clientPicker.pick(random)
    const invoiceDate = startOfDay(office.sampleTimestamp(random))
    const day = dayIndexOf(context.clock, invoiceDate)
    const domestic = counterparty.countryCode === pool.homeCountry
    const taxRate = domestic ? geography.country(counterparty.countryCode).vatRate : 0
    const lineCount = Math.min(12, 1 + random.geometric(rates.meanLinesPerInvoice - 1))
    const lines: InvoiceLine[] = []
    for (let line = 0; line < lineCount; line += 1) {
      const glAccount = account(random.pick(counterparty.accountCodes))
      const descriptions = pool.lineDescriptions[glAccount.code] ?? [glAccount.name]
      const quantity = random.chance(0.7) ? 1 : random.int(2, 25)
      const eurUnit = random.logNormal(counterparty.meanLineAmount / Math.sqrt(quantity), 0.7)
      const unitCents = Math.max(100, fx.fromEurCents(toCents(eurUnit), counterparty.currency, day))
      lines.push({
        lineNumber: line + 1,
        account: glAccount,
        description: random.pick(descriptions),
        quantity,
        unitCents,
        amountCents: unitCents * quantity,
        taxRate,
      })
    }
    const subtotalCents = lines.reduce((sum, line) => sum + line.amountCents, 0)
    const taxCents = lines.reduce(
      (sum, line) => sum + Math.round(line.amountCents * line.taxRate),
      0,
    )
    const dueDate = invoiceDate + counterparty.paymentTermsDays * MS_PER_DAY
    let status = "approved"
    let paidAt: number | null = null
    let paidShare = 0
    if (endMs - invoiceDate < 10 * MS_PER_DAY && random.chance(rates.draftShareRecent)) {
      status = "draft"
    } else if (random.chance(rates.voidShare)) {
      status = "void"
    } else {
      const offsetDays = random.chance(rates.latePaymentShare)
        ? random.int(5, 75)
        : random.int(-12, 3)
      const paymentDay = Math.max(invoiceDate + MS_PER_DAY, dueDate + offsetDays * MS_PER_DAY)
      if (paymentDay <= asOfMs) {
        paidAt = officeTime(random, paymentDay)
        if (random.chance(rates.partialPaymentShare)) {
          status = "partially_paid"
          paidShare = random.float(0.3, 0.8)
        } else {
          status = "paid"
          paidShare = 1
        }
      }
    }
    invoices.push({
      id: 0,
      sequence: index,
      number: "",
      type,
      counterparty,
      costCenter: center(random.pick(counterparty.costCenterCodes)),
      currency: counterparty.currency,
      invoiceDate,
      dueDate,
      subtotalCents,
      taxCents,
      totalCents: subtotalCents + taxCents,
      status,
      paidAt,
      paidShare,
      lines,
    })
  }
  invoices.sort(
    (left, right) => left.invoiceDate - right.invoiceDate || left.sequence - right.sequence,
  )
  const numberCounters = new Map<string, number>()
  invoices.forEach((invoice, index) => {
    invoice.id = index + 1
    const prefix = pool.invoicePrefixes[invoice.type]
    const key = `${prefix}-${yearOf(invoice.invoiceDate)}`
    const next = (numberCounters.get(key) ?? 0) + 1
    numberCounters.set(key, next)
    invoice.number = `${key}-${padNumber(next, 5)}`
  })

  const mismatchRandom = context.random("invoice_mismatches")
  const headerTotals = new Map<Invoice, { subtotal: number; tax: number; total: number }>()
  for (const invoice of invoices) {
    let subtotal = invoice.subtotalCents
    let tax = invoice.taxCents
    if (mismatchRandom.chance(rates.headerMismatchShare)) {
      const lastLine = invoice.lines[invoice.lines.length - 1]
      if (invoice.lines.length > 1 && lastLine && mismatchRandom.chance(0.6)) {
        subtotal -= lastLine.amountCents
        tax -= Math.round(lastLine.amountCents * lastLine.taxRate)
      } else {
        subtotal += mismatchRandom.int(1, 4999) * (mismatchRandom.chance(0.5) ? 1 : -1)
      }
    }
    headerTotals.set(invoice, { subtotal, tax, total: subtotal + tax })
  }

  const journals: Journal[] = []
  const descriptions = pool.ledgerDescriptions
  const ledgerRandom = context.random("ledger_entries")
  for (const invoice of invoices) {
    if (invoice.status === "draft" || invoice.status === "void") {
      continue
    }
    const day = dayIndexOf(context.clock, invoice.invoiceDate)
    const eurLines = invoice.lines.map((line) => ({
      line,
      eur: toEur(line.amountCents, invoice.currency, day),
    }))
    const eurTax = toEur(invoice.taxCents, invoice.currency, day)
    const eurTotal = eurLines.reduce((sum, entry) => sum + entry.eur, 0) + eurTax
    const values = { reference: invoice.number, counterparty: invoice.counterparty.name }
    const payable = invoice.type === "payable"
    const entries: Entry[] = eurLines.map(({ line, eur }) => ({
      account: line.account,
      costCenter: invoice.costCenter,
      description: line.description,
      debitCents: payable ? eur : 0,
      creditCents: payable ? 0 : eur,
    }))
    if (eurTax > 0) {
      entries.push({
        account: account(payable ? system.vatReceivable : system.vatPayable),
        costCenter: null,
        description: fillTemplate(descriptions.tax, values),
        debitCents: payable ? eurTax : 0,
        creditCents: payable ? 0 : eurTax,
      })
    }
    entries.push({
      account: account(payable ? system.accountsPayable : system.accountsReceivable),
      costCenter: null,
      description: fillTemplate(descriptions.control, values),
      debitCents: payable ? 0 : eurTotal,
      creditCents: payable ? eurTotal : 0,
    })
    journals.push({
      sequence: journals.length,
      entryDate: invoice.invoiceDate,
      postedAt: Math.min(
        endMs,
        officeTime(ledgerRandom, invoice.invoiceDate + ledgerRandom.int(0, 3) * MS_PER_DAY),
      ),
      sourceType: "invoice",
      reference: invoice.number,
      entries,
    })
    if (invoice.paidAt !== null) {
      const paid = Math.round(eurTotal * invoice.paidShare)
      const control = account(payable ? system.accountsPayable : system.accountsReceivable)
      const cash = account(system.cash)
      const description = fillTemplate(descriptions.payment, values)
      journals.push({
        sequence: journals.length,
        entryDate: startOfDay(invoice.paidAt),
        postedAt: Math.min(endMs, invoice.paidAt + ledgerRandom.int(1, 4) * MS_PER_HOUR),
        sourceType: "payment",
        reference: invoice.number,
        entries: [
          {
            account: payable ? control : cash,
            costCenter: null,
            description,
            debitCents: paid,
            creditCents: 0,
          },
          {
            account: payable ? cash : control,
            costCenter: null,
            description,
            debitCents: 0,
            creditCents: paid,
          },
        ],
      })
    }
  }

  const payrollRandom = context.random("payroll")
  const months: { year: number; month: number; end: number }[] = []
  for (let cursor = dayStartMs(context.clock, 0); cursor <= asOfMs;) {
    const date = new Date(cursor)
    const year = date.getUTCFullYear()
    const month = date.getUTCMonth()
    const end = endOfMonth(year, month)
    if (end <= asOfMs) {
      months.push({ year, month, end })
    }
    cursor = Date.UTC(year, month + 1, 1)
  }
  const monthNames = pools.fintech.monthNames
  months.forEach(({ year, month, end }, monthIndex) => {
    const growth = 0.82 + 0.18 * (monthIndex / Math.max(1, months.length - 1))
    const period = `${monthNames[month] ?? ""} ${year}`
    const reference = `${pool.referencePrefixes.payroll}-${year}-${padNumber(month + 1, 2)}`
    const entries: Entry[] = []
    let totalCents = 0
    for (const costCenter of costCenters) {
      if (!costCenter.active) {
        continue
      }
      const amount = toCents(costCenter.monthlyPayroll * growth * payrollRandom.float(0.97, 1.03))
      totalCents += amount
      entries.push({
        account: account(system.salaries),
        costCenter,
        description: fillTemplate(descriptions.payroll, { period }),
        debitCents: amount,
        creditCents: 0,
      })
    }
    entries.push({
      account: account(system.cash),
      costCenter: null,
      description: fillTemplate(descriptions.payroll, { period }),
      debitCents: 0,
      creditCents: totalCents,
    })
    journals.push({
      sequence: journals.length,
      entryDate: end - 2 * MS_PER_DAY,
      postedAt: officeTime(payrollRandom, end - 2 * MS_PER_DAY),
      sourceType: "payroll",
      reference,
      entries,
    })
    for (const code of pool.accrualAccountCodes) {
      const glAccount = account(code)
      const costCenter = payrollRandom.pick(costCenters.filter((candidate) => candidate.active))
      const amount = toCents(payrollRandom.logNormal(9000, 0.5))
      const accrualReference = `${pool.referencePrefixes.accrual}-${year}-${padNumber(month + 1, 2)}-${code}`
      const values = { account: glAccount.name }
      journals.push({
        sequence: journals.length,
        entryDate: end,
        postedAt: officeTime(payrollRandom, end),
        sourceType: "accrual",
        reference: accrualReference,
        entries: [
          {
            account: glAccount,
            costCenter,
            description: fillTemplate(descriptions.accrual, values),
            debitCents: amount,
            creditCents: 0,
          },
          {
            account: account(system.accruedLiabilities),
            costCenter: null,
            description: fillTemplate(descriptions.accrual, values),
            debitCents: 0,
            creditCents: amount,
          },
        ],
      })
      const reversalDate = end + MS_PER_DAY
      if (reversalDate <= asOfMs) {
        journals.push({
          sequence: journals.length,
          entryDate: reversalDate,
          postedAt: officeTime(payrollRandom, reversalDate),
          sourceType: "accrual",
          reference: accrualReference,
          entries: [
            {
              account: account(system.accruedLiabilities),
              costCenter: null,
              description: fillTemplate(descriptions.accrualReversal, values),
              debitCents: amount,
              creditCents: 0,
            },
            {
              account: glAccount,
              costCenter,
              description: fillTemplate(descriptions.accrualReversal, values),
              debitCents: 0,
              creditCents: amount,
            },
          ],
        })
      }
    }
  })
  journals.sort((left, right) => left.postedAt - right.postedAt || left.sequence - right.sequence)
  const entryRows = journals.flatMap((journal, index) =>
    journal.entries.map((entry) => ({ journalId: index + 1, journal, entry })),
  )

  const actuals = new Map<string, number>()
  for (const { journal, entry } of entryRows) {
    if (entry.costCenter === null || entry.account.type !== "expense") {
      continue
    }
    const key = `${entry.costCenter.code}|${entry.account.code}|${monthKey(journal.entryDate)}`
    actuals.set(key, (actuals.get(key) ?? 0) + entry.debitCents - entry.creditCents)
  }
  const budgetRandom = context.random("budgets")
  const budgets: {
    year: number
    month: number
    costCenter: CostCenter
    account: GlAccount
    cents: number
  }[] = []
  for (const costCenter of costCenters.filter((candidate) => candidate.active)) {
    for (const code of pool.budgetAccountCodes) {
      const glAccount = account(code)
      const series = months.map(
        ({ year, month }) =>
          actuals.get(`${costCenter.code}|${code}|${year}-${padNumber(month + 1, 2)}`) ?? 0,
      )
      const nonZero = series.filter((value) => value > 0)
      if (nonZero.length === 0) {
        continue
      }
      const average = nonZero.reduce((sum, value) => sum + value, 0) / series.length
      months.forEach(({ year, month }, monthIndex) => {
        const trend = 0.9 + 0.2 * (monthIndex / Math.max(1, months.length - 1))
        const amount =
          Math.round(
            (average * trend * budgetRandom.float(rates.budgetNoise[0], rates.budgetNoise[1])) /
              10000,
          ) * 10000
        budgets.push({
          year,
          month: month + 1,
          costCenter,
          account: glAccount,
          cents: Math.max(10000, amount),
        })
      })
    }
  }

  const rateCurrencies = pool.exchangeRateCurrencies
  return [
    defineTable(
      "cost_centers",
      [
        "cost_center_id",
        "cost_center_code",
        "cost_center_name",
        "division",
        "owner_name",
        "is_active",
      ],
      costCenters,
      (costCenter): Row => [
        costCenter.id,
        costCenter.code,
        costCenter.name,
        costCenter.division,
        costCenter.owner,
        costCenter.active,
      ],
    ),
    defineTable(
      "accounts",
      [
        "account_id",
        "account_code",
        "account_name",
        "account_type",
        "account_subtype",
        "normal_balance",
        "is_active",
      ],
      accounts,
      (glAccount): Row => [
        glAccount.id,
        glAccount.code,
        glAccount.name,
        glAccount.type,
        glAccount.subtype,
        glAccount.normalBalance,
        glAccount.active,
      ],
    ),
    {
      name: "exchange_rates",
      columns: ["rate_date", "from_currency", "to_currency", "rate"],
      rowCount: context.clock.dayCount * rateCurrencies.length,
      *rows() {
        for (let day = 0; day < context.clock.dayCount; day += 1) {
          const date = formatDate(dayStartMs(context.clock, day))
          for (const currency of rateCurrencies) {
            const row: Row = [
              date,
              currency,
              pool.functionalCurrency,
              fixed(1 / fx.rate(currency, day), 8),
            ]
            yield row
          }
        }
      },
    },
    defineTable(
      "invoices",
      [
        "invoice_id",
        "invoice_number",
        "invoice_type",
        "counterparty_name",
        "counterparty_country",
        "cost_center_id",
        "currency",
        "invoice_date",
        "due_date",
        "subtotal_amount",
        "tax_amount",
        "total_amount",
        "status",
        "paid_at",
      ],
      invoices,
      (invoice): Row => {
        const header = headerTotals.get(invoice) ?? {
          subtotal: invoice.subtotalCents,
          tax: invoice.taxCents,
          total: invoice.totalCents,
        }
        return [
          invoice.id,
          invoice.number,
          invoice.type,
          invoice.counterparty.name,
          invoice.counterparty.countryCode,
          invoice.costCenter.id,
          invoice.currency,
          formatDate(invoice.invoiceDate),
          formatDate(invoice.dueDate),
          money(header.subtotal),
          money(header.tax),
          money(header.total),
          invoice.status,
          invoice.paidAt === null ? null : formatTimestamp(invoice.paidAt),
        ]
      },
    ),
    defineTable(
      "invoice_lines",
      [
        "invoice_line_id",
        "invoice_id",
        "line_number",
        "account_id",
        "description",
        "quantity",
        "unit_price",
        "line_amount",
        "tax_rate",
      ],
      invoices.flatMap((invoice) => invoice.lines.map((line) => ({ invoice, line }))),
      ({ invoice, line }, index): Row => [
        index + 1,
        invoice.id,
        line.lineNumber,
        line.account.id,
        line.description,
        fixed(line.quantity, 2),
        money(line.unitCents),
        money(line.amountCents),
        fixed(line.taxRate, 4),
      ],
    ),
    defineTable(
      "ledger_entries",
      [
        "entry_id",
        "journal_id",
        "entry_date",
        "account_id",
        "cost_center_id",
        "description",
        "debit_amount",
        "credit_amount",
        "currency",
        "source_type",
        "source_reference",
        "posted_at",
      ],
      entryRows,
      ({ journalId, journal, entry }, index): Row => [
        index + 1,
        journalId,
        formatDate(journal.entryDate),
        entry.account.id,
        entry.costCenter?.id ?? null,
        entry.description,
        money(entry.debitCents),
        money(entry.creditCents),
        pool.functionalCurrency,
        journal.sourceType,
        journal.reference,
        formatTimestamp(journal.postedAt),
      ],
    ),
    defineTable(
      "budgets",
      [
        "budget_id",
        "fiscal_year",
        "fiscal_month",
        "cost_center_id",
        "account_id",
        "budget_amount",
        "currency",
      ],
      budgets,
      (budget, index): Row => [
        index + 1,
        budget.year,
        budget.month,
        budget.costCenter.id,
        budget.account.id,
        money(budget.cents),
        pool.functionalCurrency,
      ],
    ),
  ]
}
