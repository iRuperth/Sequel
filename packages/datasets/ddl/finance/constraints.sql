ALTER TABLE cost_centers ADD CONSTRAINT cost_centers_cost_center_code_key UNIQUE (cost_center_code);

ALTER TABLE accounts ADD CONSTRAINT accounts_account_code_key UNIQUE (account_code);

ALTER TABLE invoices ADD CONSTRAINT invoices_invoice_number_key UNIQUE (invoice_number);
ALTER TABLE invoices
  ADD CONSTRAINT invoices_cost_center_id_fkey FOREIGN KEY (cost_center_id) REFERENCES cost_centers (cost_center_id);
CREATE INDEX invoices_invoice_date_idx ON invoices (invoice_date);

ALTER TABLE invoice_lines
  ADD CONSTRAINT invoice_lines_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES invoices (invoice_id);
ALTER TABLE invoice_lines
  ADD CONSTRAINT invoice_lines_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts (account_id);
ALTER TABLE invoice_lines ADD CONSTRAINT invoice_lines_invoice_line_key UNIQUE (invoice_id, line_number);

ALTER TABLE ledger_entries
  ADD CONSTRAINT ledger_entries_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts (account_id);
ALTER TABLE ledger_entries
  ADD CONSTRAINT ledger_entries_cost_center_id_fkey FOREIGN KEY (cost_center_id) REFERENCES cost_centers (cost_center_id);
CREATE INDEX ledger_entries_journal_id_idx ON ledger_entries (journal_id);
CREATE INDEX ledger_entries_entry_date_idx ON ledger_entries (entry_date);
CREATE INDEX ledger_entries_account_id_idx ON ledger_entries (account_id, entry_date);

ALTER TABLE budgets
  ADD CONSTRAINT budgets_cost_center_id_fkey FOREIGN KEY (cost_center_id) REFERENCES cost_centers (cost_center_id);
ALTER TABLE budgets
  ADD CONSTRAINT budgets_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts (account_id);
ALTER TABLE budgets
  ADD CONSTRAINT budgets_period_key UNIQUE (fiscal_year, fiscal_month, cost_center_id, account_id);
