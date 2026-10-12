ALTER TABLE account_holders ADD CONSTRAINT account_holders_customer_number_key UNIQUE (customer_number);

ALTER TABLE kyc_checks
  ADD CONSTRAINT kyc_checks_holder_id_fkey FOREIGN KEY (holder_id) REFERENCES account_holders (holder_id);
CREATE INDEX kyc_checks_holder_id_idx ON kyc_checks (holder_id);

ALTER TABLE accounts
  ADD CONSTRAINT accounts_holder_id_fkey FOREIGN KEY (holder_id) REFERENCES account_holders (holder_id);
ALTER TABLE accounts ADD CONSTRAINT accounts_iban_key UNIQUE (iban);
CREATE INDEX accounts_holder_id_idx ON accounts (holder_id);

ALTER TABLE cards
  ADD CONSTRAINT cards_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts (account_id);
ALTER TABLE cards
  ADD CONSTRAINT cards_holder_id_fkey FOREIGN KEY (holder_id) REFERENCES account_holders (holder_id);
CREATE INDEX cards_account_id_idx ON cards (account_id);
CREATE INDEX cards_holder_id_idx ON cards (holder_id);

ALTER TABLE merchants
  ADD CONSTRAINT merchants_mcc_fkey FOREIGN KEY (mcc) REFERENCES merchant_categories (mcc);
CREATE INDEX merchants_mcc_idx ON merchants (mcc);

ALTER TABLE transactions
  ADD CONSTRAINT transactions_card_id_fkey FOREIGN KEY (card_id) REFERENCES cards (card_id);
ALTER TABLE transactions
  ADD CONSTRAINT transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts (account_id);
ALTER TABLE transactions
  ADD CONSTRAINT transactions_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES merchants (merchant_id);
ALTER TABLE transactions
  ADD CONSTRAINT transactions_mcc_fkey FOREIGN KEY (mcc) REFERENCES merchant_categories (mcc);
CREATE INDEX transactions_card_id_created_at_idx ON transactions (card_id, created_at);
CREATE INDEX transactions_account_id_created_at_idx ON transactions (account_id, created_at);
CREATE INDEX transactions_merchant_id_idx ON transactions (merchant_id);
CREATE INDEX transactions_created_at_idx ON transactions (created_at);

ALTER TABLE transfers
  ADD CONSTRAINT transfers_from_account_id_fkey FOREIGN KEY (from_account_id) REFERENCES accounts (account_id);
ALTER TABLE transfers
  ADD CONSTRAINT transfers_to_account_id_fkey FOREIGN KEY (to_account_id) REFERENCES accounts (account_id);
CREATE INDEX transfers_from_account_id_idx ON transfers (from_account_id);
CREATE INDEX transfers_to_account_id_idx ON transfers (to_account_id);
CREATE INDEX transfers_initiated_at_idx ON transfers (initiated_at);

ALTER TABLE fraud_alerts
  ADD CONSTRAINT fraud_alerts_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES transactions (transaction_id);
ALTER TABLE fraud_alerts
  ADD CONSTRAINT fraud_alerts_card_id_fkey FOREIGN KEY (card_id) REFERENCES cards (card_id);
CREATE INDEX fraud_alerts_transaction_id_idx ON fraud_alerts (transaction_id);
CREATE INDEX fraud_alerts_card_id_idx ON fraud_alerts (card_id);

ALTER TABLE disputes
  ADD CONSTRAINT disputes_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES transactions (transaction_id);
CREATE INDEX disputes_transaction_id_idx ON disputes (transaction_id);

ALTER TABLE loans
  ADD CONSTRAINT loans_holder_id_fkey FOREIGN KEY (holder_id) REFERENCES account_holders (holder_id);
ALTER TABLE loans
  ADD CONSTRAINT loans_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts (account_id);
CREATE INDEX loans_holder_id_idx ON loans (holder_id);

ALTER TABLE loan_repayments
  ADD CONSTRAINT loan_repayments_loan_id_fkey FOREIGN KEY (loan_id) REFERENCES loans (loan_id);
ALTER TABLE loan_repayments
  ADD CONSTRAINT loan_repayments_loan_installment_key UNIQUE (loan_id, installment_number);

ALTER TABLE ledger_postings
  ADD CONSTRAINT ledger_postings_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts (account_id);
CREATE INDEX ledger_postings_account_id_posted_at_idx ON ledger_postings (account_id, posted_at);
CREATE INDEX ledger_postings_journal_id_idx ON ledger_postings (journal_id);
CREATE INDEX ledger_postings_source_idx ON ledger_postings (source_type, source_id);
