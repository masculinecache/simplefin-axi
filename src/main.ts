import { fetchAccounts, listAccounts, getAccount, listTransactions, getBalances, storeAccounts, storeTransactions } from "./store.js";
import { execute, executeBulk, queryRows, DB_NAME } from "./d1.js";
import { toonTable, toonObject, toonHelp, toonError } from "./toon.js";

const VERSION = "0.1.0";
const DESCRIPTION = "Agent-ergonomic CLI for SimpleFIN financial data on Cloudflare D1";

function home(): string {
  const bin = process.argv[1] || "simplefin-axi";
  const parts = [`bin: ${bin.replace(process.env.HOME ?? "", "~")}`, `description: ${DESCRIPTION}`];

  const tables = queryRows("SELECT name FROM sqlite_master WHERE type='table' AND name='accounts'");
  if (tables.length === 0) {
    parts.push("", "db: not initialized", toonHelp(["Run `simplefin-axi init` to create the D1 schema", "Run `simplefin-axi fetch` to pull accounts from SimpleFIN Bridge"]));
    return parts.join("\n");
  }

  const accts = listAccounts();
  if (accts.length === 0) {
    parts.push("", "accounts: 0 (no data yet)", toonHelp(["Run `simplefin-axi fetch` to pull accounts from SimpleFIN Bridge"]));
    return parts.join("\n");
  }

  parts.push("", toonTable("accounts", ["id", "name", "balance", "currency", "institution"], accts.map((a) => ({
    id: a.id.slice(0, 8) + "...",
    name: a.name,
    balance: a.balance,
    currency: a.currency,
    institution: a.institution,
  }))));
  parts.push("", toonHelp([
    "Run `simplefin-axi balances` for balance summary",
    "Run `simplefin-axi transactions` for recent transactions",
    "Run `simplefin-axi fetch` to refresh from SimpleFIN Bridge",
    "Run `simplefin-axi account <id>` for account detail",
  ]));
  return parts.join("\n");
}

function initCmd(): string {
  const existing = queryRows("SELECT name FROM sqlite_master WHERE type='table' AND name='accounts'");
  if (existing.length > 0) return "db: already initialized (no-op)";

  executeBulk([
    `CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, name TEXT NOT NULL, currency TEXT NOT NULL DEFAULT 'USD', balance REAL NOT NULL DEFAULT 0, available_balance REAL NOT NULL DEFAULT 0, balance_date TEXT NOT NULL, institution TEXT NOT NULL DEFAULT '', org_domain TEXT NOT NULL DEFAULT '', last_four TEXT, updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, account_id TEXT NOT NULL, amount REAL NOT NULL, description TEXT NOT NULL DEFAULT '', date TEXT NOT NULL, posted_date TEXT, payee TEXT, memo TEXT, mcc TEXT, updated_at TEXT NOT NULL, FOREIGN KEY (account_id) REFERENCES accounts(id))`,
    `CREATE INDEX IF NOT EXISTS idx_transactions_account_date ON transactions(account_id, date DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC)`,
    `CREATE TABLE IF NOT EXISTS sync_log (id INTEGER PRIMARY KEY AUTOINCREMENT, started_at TEXT NOT NULL, completed_at TEXT, accounts_synced INTEGER NOT NULL DEFAULT 0, transactions_upserted INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'running')`,
  ]);

  return `db: initialized in D1 ${DB_NAME}\n${toonHelp(["Run `simplefin-axi fetch` to pull accounts from SimpleFIN Bridge"])}`;
}

async function fetchCmd(): Promise<string> {
  const tables = queryRows("SELECT name FROM sqlite_master WHERE type='table' AND name='accounts'");
  if (tables.length === 0) return toonError("Database not initialized", ["Run `simplefin-axi init` first"]);

  const accounts = await fetchAccounts();
  const acctCount = storeAccounts(accounts);

  let txCount = 0;
  for (const acct of accounts) {
    if (acct.transactions && acct.transactions.length > 0) {
      txCount += storeTransactions(acct.id, acct.transactions);
    }
  }

  const accts = listAccounts();
  return [
    `synced: ${acctCount} accounts, ${txCount} transactions upserted`,
    "",
    toonTable("accounts", ["id", "name", "balance", "currency"], accts.map((a) => ({
      id: a.id.slice(0, 8) + "...",
      name: a.name,
      balance: a.balance,
      currency: a.currency,
    }))),
  ].join("\n");
}

function balancesCmd(): string {
  const bals = getBalances();
  if (bals.length === 0) return "balances: 0 (no data yet)";
  return toonTable("balances", ["account_name", "balance", "available_balance", "currency", "balance_date", "institution"], bals);
}

function transactionsCmd(args: string[]): string {
  let accountId: string | undefined;
  let days = 30;
  let limit = 100;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--account" && args[i + 1]) { accountId = args[++i]; continue; }
    if (args[i] === "--days" && args[i + 1]) { days = parseInt(args[++i], 10); continue; }
    if (args[i] === "--limit" && args[i + 1]) { limit = parseInt(args[++i], 10); continue; }
    if (!args[i].startsWith("--")) accountId = args[i];
  }

  const txns = listTransactions(accountId, days, limit);
  if (txns.length === 0) return `transactions: 0 in last ${days} days`;

  return [
    `count: ${txns.length} of ${limit} max, last ${days} days`,
    "",
    toonTable("transactions", ["date", "amount", "description", "payee"], txns.map((t) => ({
      date: t.date,
      amount: t.amount,
      description: (t.description || "").slice(0, 50),
      payee: (t.payee || "").slice(0, 20),
    }))),
    "",
    toonHelp([
      "Run `simplefin-axi transactions --days 90` for a wider window",
      "Run `simplefin-axi transactions --account <id>` to filter by account",
      "Run `simplefin-axi transactions --limit 500` for more rows",
    ]),
  ].join("\n");
}

function accountCmd(id: string): string {
  const acct = getAccount(id);
  if (!acct) return toonError(`Account ${id} not found`, ["Run `simplefin-axi accounts` to list accounts"]);

  return toonObject("account", {
    id: acct.id,
    name: acct.name,
    balance: acct.balance,
    available_balance: acct.available_balance,
    currency: acct.currency,
    balance_date: acct.balance_date,
    institution: acct.institution,
    last_four: acct.last_four ?? "",
  });
}

function accountsCmd(): string {
  const accts = listAccounts();
  if (accts.length === 0) return "accounts: 0 (run `simplefin-axi fetch` to populate)";
  return toonTable("accounts", ["id", "name", "balance", "currency", "institution", "balance_date"], accts.map((a) => ({
    id: a.id.slice(0, 8) + "...",
    name: a.name,
    balance: a.balance,
    currency: a.currency,
    institution: a.institution,
    balance_date: a.balance_date,
  })));
}

function helpCmd(): string {
  return [
    `simplefin-axi — ${DESCRIPTION}`,
    "",
    "usage: simplefin-axi [command] [args] [flags]",
    "",
    "commands[7]:",
    "  (none)    dashboard — accounts overview and next steps",
    "  init      create D1 schema (idempotent)",
    "  fetch     pull accounts + transactions from SimpleFIN Bridge into D1",
    "  accounts  list all accounts",
    "  account   show one account detail",
    "  balances  balance summary across accounts",
    "  transactions  recent transactions (--days, --account, --limit)",
    "",
    "flags:",
    "  --help, -v/--version",
    "",
    "examples:",
    "  simplefin-axi",
    "  simplefin-axi init",
    "  simplefin-axi fetch",
    "  simplefin-axi balances",
    "  simplefin-axi transactions --days 90",
    "  simplefin-axi account <id>",
  ].join("\n");
}

export async function main(argv: string[]): Promise<void> {
  const cmd = argv[0];

  if (cmd === "--help" || cmd === "-h") { process.stdout.write(helpCmd() + "\n"); return; }
  if (cmd === "--version" || cmd === "-v") { process.stdout.write(`simplefin-axi ${VERSION}\n`); return; }

  switch (cmd) {
    case undefined:
      process.stdout.write(home() + "\n");
      break;
    case "init":
      process.stdout.write(initCmd() + "\n");
      break;
    case "fetch":
      process.stdout.write((await fetchCmd()) + "\n");
      break;
    case "accounts":
      process.stdout.write(accountsCmd() + "\n");
      break;
    case "account":
      if (!argv[1]) { process.stdout.write(toonError("account id required", ["Run `simplefin-axi accounts` to list accounts"]) + "\n"); process.exit(2); }
      process.stdout.write(accountCmd(argv[1]) + "\n");
      break;
    case "balances":
      process.stdout.write(balancesCmd() + "\n");
      break;
    case "transactions":
      process.stdout.write(transactionsCmd(argv.slice(1)) + "\n");
      break;
    default:
      process.stdout.write(toonError(`unknown command: ${cmd}`, ["Run `simplefin-axi --help` for available commands"]) + "\n");
      process.exit(2);
  }
}
