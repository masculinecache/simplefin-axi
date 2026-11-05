DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS accounts;
DROP TABLE IF EXISTS sync_log;

CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  balance REAL NOT NULL DEFAULT 0,
  available_balance REAL NOT NULL DEFAULT 0,
  balance_date TEXT NOT NULL,
  institution TEXT NOT NULL DEFAULT '',
  org_domain TEXT NOT NULL DEFAULT '',
  last_four TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  amount REAL NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL,
  posted_date TEXT,
  payee TEXT,
  memo TEXT,
  mcc TEXT,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

CREATE INDEX idx_transactions_account_date ON transactions(account_id, date DESC);
CREATE INDEX idx_transactions_date ON transactions(date DESC);

CREATE TABLE sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  accounts_synced INTEGER NOT NULL DEFAULT 0,
  transactions_upserted INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'running'
);
