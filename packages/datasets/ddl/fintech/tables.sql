CREATE TABLE account_holders (
  holder_id bigint PRIMARY KEY,
  customer_number text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone_number text,
  date_of_birth date NOT NULL,
  country_code char(2) NOT NULL,
  city text NOT NULL,
  plan text NOT NULL CHECK (plan IN ('standard', 'plus', 'premium')),
  risk_rating text NOT NULL CHECK (risk_rating IN ('low', 'medium', 'high')),
  status text NOT NULL CHECK (status IN ('active', 'suspended', 'closed')),
  onboarded_at timestamptz NOT NULL,
  closed_at timestamptz
);

CREATE TABLE kyc_checks (
  kyc_check_id bigint PRIMARY KEY,
  holder_id bigint NOT NULL,
  check_type text NOT NULL CHECK (
    check_type IN ('identity_document', 'proof_of_address', 'sanctions_screening', 'pep_screening')
  ),
  provider text NOT NULL,
  status text NOT NULL CHECK (status IN ('passed', 'failed', 'pending', 'manual_review')),
  match_score numeric(5, 2),
  payload jsonb NOT NULL,
  submitted_at timestamptz NOT NULL,
  completed_at timestamptz
);

CREATE TABLE accounts (
  account_id bigint PRIMARY KEY,
  holder_id bigint NOT NULL,
  iban text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('current', 'savings', 'business')),
  currency char(3) NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'frozen', 'closed')),
  overdraft_limit numeric(14, 2) NOT NULL CHECK (overdraft_limit >= 0),
  current_balance numeric(14, 2) NOT NULL,
  opened_at timestamptz NOT NULL,
  closed_at timestamptz
);

CREATE TABLE cards (
  card_id bigint PRIMARY KEY,
  account_id bigint NOT NULL,
  holder_id bigint NOT NULL,
  network text NOT NULL CHECK (network IN ('visa', 'mastercard')),
  form_factor text NOT NULL CHECK (form_factor IN ('physical', 'virtual')),
  pan_last4 char(4) NOT NULL,
  currency char(3) NOT NULL,
  daily_limit numeric(14, 2) NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'blocked', 'expired', 'cancelled')),
  issued_at timestamptz NOT NULL,
  expires_on date NOT NULL,
  deactivated_at timestamptz
);

CREATE TABLE merchant_categories (
  mcc char(4) PRIMARY KEY,
  category_name text NOT NULL,
  category_group text NOT NULL,
  is_high_risk boolean NOT NULL
);

CREATE TABLE merchants (
  merchant_id bigint PRIMARY KEY,
  merchant_name text NOT NULL,
  mcc char(4) NOT NULL,
  country_code char(2) NOT NULL,
  city text,
  currency char(3) NOT NULL,
  is_online boolean NOT NULL,
  created_at timestamptz NOT NULL
);

CREATE TABLE transactions (
  transaction_id bigint PRIMARY KEY,
  card_id bigint NOT NULL,
  account_id bigint NOT NULL,
  merchant_id bigint,
  merchant_descriptor text NOT NULL,
  mcc char(4) NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('purchase', 'refund', 'atm_withdrawal')),
  channel text NOT NULL CHECK (channel IN ('contactless', 'chip', 'ecommerce', 'atm')),
  amount numeric(14, 2) NOT NULL CHECK (amount > 0),
  currency char(3) NOT NULL,
  billing_amount numeric(14, 2) NOT NULL CHECK (billing_amount > 0),
  billing_currency char(3) NOT NULL,
  status text NOT NULL CHECK (status IN ('authorized', 'settled', 'declined', 'reversed')),
  decline_reason text,
  created_at timestamptz NOT NULL,
  settled_at timestamptz
);

CREATE TABLE transfers (
  transfer_id bigint PRIMARY KEY,
  transfer_type text NOT NULL CHECK (transfer_type IN ('inbound', 'outbound', 'internal')),
  from_account_id bigint,
  to_account_id bigint,
  counterparty_name text,
  counterparty_iban text,
  scheme text NOT NULL CHECK (
    scheme IN ('sepa_credit', 'sepa_instant', 'faster_payments', 'ach', 'swift', 'book_transfer')
  ),
  amount numeric(14, 2) NOT NULL CHECK (amount > 0),
  currency char(3) NOT NULL,
  reference text,
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'returned')),
  initiated_at timestamptz NOT NULL,
  completed_at timestamptz,
  CHECK (from_account_id IS NOT NULL OR to_account_id IS NOT NULL)
);

CREATE TABLE fx_rates (
  rate_date date NOT NULL,
  base_currency char(3) NOT NULL,
  quote_currency char(3) NOT NULL,
  rate numeric(18, 8) NOT NULL CHECK (rate > 0),
  source text NOT NULL,
  PRIMARY KEY (rate_date, base_currency, quote_currency)
);

CREATE TABLE fraud_alerts (
  alert_id bigint PRIMARY KEY,
  transaction_id bigint NOT NULL,
  card_id bigint NOT NULL,
  rule_code text NOT NULL,
  rule_name text NOT NULL,
  risk_score numeric(5, 2) NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status text NOT NULL CHECK (status IN ('open', 'investigating', 'confirmed_fraud', 'false_positive')),
  assigned_analyst text,
  created_at timestamptz NOT NULL,
  resolved_at timestamptz
);

CREATE TABLE disputes (
  dispute_id bigint PRIMARY KEY,
  transaction_id bigint NOT NULL,
  reason text NOT NULL CHECK (
    reason IN (
      'fraud',
      'duplicate_processing',
      'goods_not_received',
      'not_as_described',
      'cancelled_recurring',
      'incorrect_amount'
    )
  ),
  network_reason_code text NOT NULL,
  disputed_amount numeric(14, 2) NOT NULL CHECK (disputed_amount > 0),
  currency char(3) NOT NULL,
  status text NOT NULL CHECK (status IN ('open', 'under_review', 'won', 'lost', 'withdrawn')),
  opened_at timestamptz NOT NULL,
  resolved_at timestamptz
);

CREATE TABLE loans (
  loan_id bigint PRIMARY KEY,
  holder_id bigint NOT NULL,
  account_id bigint NOT NULL,
  product text NOT NULL CHECK (product IN ('personal', 'auto', 'home_improvement', 'debt_consolidation')),
  principal numeric(14, 2) NOT NULL CHECK (principal > 0),
  currency char(3) NOT NULL,
  annual_rate numeric(6, 4) NOT NULL,
  term_months integer NOT NULL CHECK (term_months > 0),
  monthly_installment numeric(14, 2) NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'delinquent', 'defaulted', 'paid_off')),
  originated_at timestamptz NOT NULL,
  first_due_date date NOT NULL
);

CREATE TABLE loan_repayments (
  repayment_id bigint PRIMARY KEY,
  loan_id bigint NOT NULL,
  installment_number integer NOT NULL,
  due_date date NOT NULL,
  amount_due numeric(14, 2) NOT NULL,
  amount_paid numeric(14, 2) NOT NULL CHECK (amount_paid >= 0),
  paid_at timestamptz,
  days_past_due integer NOT NULL CHECK (days_past_due >= 0),
  status text NOT NULL CHECK (status IN ('pending', 'paid', 'paid_late', 'partial', 'missed'))
);

CREATE TABLE ledger_postings (
  posting_id bigint PRIMARY KEY,
  journal_id bigint NOT NULL,
  account_id bigint,
  gl_account text NOT NULL,
  entry_side text NOT NULL CHECK (entry_side IN ('debit', 'credit')),
  amount numeric(14, 2) NOT NULL CHECK (amount > 0),
  currency char(3) NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('card_transaction', 'transfer', 'opening_balance')),
  source_id bigint NOT NULL,
  posted_at timestamptz NOT NULL
);
