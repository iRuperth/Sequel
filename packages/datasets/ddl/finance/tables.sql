CREATE TABLE cost_centers (
  cost_center_id bigint PRIMARY KEY,
  cost_center_code text NOT NULL,
  cost_center_name text NOT NULL,
  division text NOT NULL,
  owner_name text NOT NULL,
  is_active boolean NOT NULL
);

CREATE TABLE accounts (
  account_id bigint PRIMARY KEY,
  account_code text NOT NULL,
  account_name text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  account_subtype text NOT NULL,
  normal_balance text NOT NULL CHECK (normal_balance IN ('debit', 'credit')),
  is_active boolean NOT NULL
);

CREATE TABLE exchange_rates (
  rate_date date NOT NULL,
  from_currency char(3) NOT NULL,
  to_currency char(3) NOT NULL,
  rate numeric(18, 8) NOT NULL CHECK (rate > 0),
  PRIMARY KEY (rate_date, from_currency, to_currency)
);

CREATE TABLE invoices (
  invoice_id bigint PRIMARY KEY,
  invoice_number text NOT NULL,
  invoice_type text NOT NULL CHECK (invoice_type IN ('payable', 'receivable')),
  counterparty_name text NOT NULL,
  counterparty_country char(2) NOT NULL,
  cost_center_id bigint NOT NULL,
  currency char(3) NOT NULL,
  invoice_date date NOT NULL,
  due_date date NOT NULL,
  subtotal_amount numeric(14, 2) NOT NULL,
  tax_amount numeric(14, 2) NOT NULL,
  total_amount numeric(14, 2) NOT NULL,
  status text NOT NULL CHECK (status IN ('draft', 'approved', 'paid', 'partially_paid', 'void')),
  paid_at timestamptz
);

CREATE TABLE invoice_lines (
  invoice_line_id bigint PRIMARY KEY,
  invoice_id bigint NOT NULL,
  line_number integer NOT NULL,
  account_id bigint NOT NULL,
  description text NOT NULL,
  quantity numeric(12, 2) NOT NULL CHECK (quantity > 0),
  unit_price numeric(14, 2) NOT NULL,
  line_amount numeric(14, 2) NOT NULL,
  tax_rate numeric(5, 4) NOT NULL
);

CREATE TABLE ledger_entries (
  entry_id bigint PRIMARY KEY,
  journal_id bigint NOT NULL,
  entry_date date NOT NULL,
  account_id bigint NOT NULL,
  cost_center_id bigint,
  description text NOT NULL,
  debit_amount numeric(14, 2) NOT NULL CHECK (debit_amount >= 0),
  credit_amount numeric(14, 2) NOT NULL CHECK (credit_amount >= 0),
  currency char(3) NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('invoice', 'payment', 'payroll', 'accrual')),
  source_reference text,
  posted_at timestamptz NOT NULL
);

CREATE TABLE budgets (
  budget_id bigint PRIMARY KEY,
  fiscal_year integer NOT NULL,
  fiscal_month integer NOT NULL CHECK (fiscal_month BETWEEN 1 AND 12),
  cost_center_id bigint NOT NULL,
  account_id bigint NOT NULL,
  budget_amount numeric(14, 2) NOT NULL,
  currency char(3) NOT NULL
);
