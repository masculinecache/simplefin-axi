import { resolveAccessUrl } from "./cred.js";
import { queryRows, executeBulk } from "./d1.js";
import type { D1Account, D1Transaction, AccountBalance, SimpleFINAccount, SimpleFINTransaction } from "./types.js";

function parseAccessUrl(raw: string): { baseUrl: string; authHeader: string } {
  const url = new URL(raw);
  const user = decodeURIComponent(url.username);
  const pass = decodeURIComponent(url.password);
  const baseUrl = `${url.protocol}//${url.host}${url.pathname.replace(/\/$/, "")}`;
  const authHeader = "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
  return { baseUrl, authHeader };
}

export async function fetchAccounts(): Promise<SimpleFINAccount[]> {
  const accessUrl = resolveAccessUrl();
  if (!accessUrl) throw new Error("SIMPLEFIN_ACCESS_URL not found (env or BWS)");

  const { baseUrl, authHeader } = parseAccessUrl(accessUrl);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 90);
  const startTs = Math.floor(startDate.getTime() / 1000);

  const resp = await fetch(`${baseUrl}/accounts?start-date=${startTs}`, {
    headers: { Accept: "application/json", Authorization: authHeader },
  });
  if (!resp.ok) throw new Error(`SimpleFIN /accounts: ${resp.status} ${await resp.text()}`);

  const data = await resp.json() as { errors: unknown[]; accounts: SimpleFINAccount[] };
  return data.accounts ?? [];
}

export function listAccounts(): D1Account[] {
  const rows = queryRows("SELECT * FROM accounts ORDER BY name");
  return rows as D1Account[];
}

export function getAccount(accountId: string): D1Account | null {
  const rows = queryRows(`SELECT * FROM accounts WHERE id = '${accountId}'`);
  return (rows[0] as D1Account) ?? null;
}

export function listTransactions(accountId?: string, days = 30, limit = 100): D1Transaction[] {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split("T")[0];

  let sql = `SELECT * FROM transactions WHERE date >= '${sinceStr}'`;
  if (accountId) sql += ` AND account_id = '${accountId}'`;
  sql += ` ORDER BY date DESC LIMIT ${limit}`;

  return queryRows(sql) as D1Transaction[];
}

export function getBalances(): AccountBalance[] {
  const rows = queryRows(`
    SELECT
      a.id as account_id,
      a.name as account_name,
      a.balance,
      a.available_balance,
      a.currency,
      a.balance_date,
      a.institution
    FROM accounts a
    ORDER BY a.name
  `);
  return rows as AccountBalance[];
}

function esc(s: string | null | undefined): string {
  if (!s) return "''";
  return `'${s.replace(/'/g, "''")}'`;
}

export function storeAccounts(accounts: SimpleFINAccount[]): number {
  if (accounts.length === 0) return 0;
  const now = new Date().toISOString();
  const stmts = accounts.map((acct) => {
    const balanceDate = new Date(acct["balance-date"] * 1000).toISOString().split("T")[0];
    return `INSERT INTO accounts (id, name, currency, balance, available_balance, balance_date, institution, org_domain, last_four, updated_at) VALUES (${esc(acct.id)}, ${esc(acct.name)}, ${esc(acct.currency)}, ${parseFloat(acct.balance) || 0}, ${parseFloat(acct["available-balance"]) || 0}, ${esc(balanceDate)}, ${esc(acct.org?.name || "")}, ${esc(acct.org?.domain || "")}, NULL, '${now}') ON CONFLICT(id) DO UPDATE SET name = excluded.name, balance = excluded.balance, available_balance = excluded.available_balance, balance_date = excluded.balance_date, institution = excluded.institution, updated_at = excluded.updated_at`;
  });
  executeBulk(stmts);
  return accounts.length;
}

export function storeTransactions(accountId: string, transactions: SimpleFINTransaction[]): number {
  if (transactions.length === 0) return 0;
  const now = new Date().toISOString();
  const stmts = transactions.map((tx) => {
    const txDate = tx.transacted_at ? new Date(tx.transacted_at * 1000).toISOString().split("T")[0] : "";
    const postedDate = tx.posted ? new Date(tx.posted * 1000).toISOString().split("T")[0] : null;
    return `INSERT INTO transactions (id, account_id, amount, description, date, posted_date, payee, memo, mcc, updated_at) VALUES (${esc(tx.id)}, ${esc(accountId)}, ${parseFloat(tx.amount) || 0}, ${esc(tx.description)}, ${esc(txDate)}, ${postedDate ? esc(postedDate) : "NULL"}, ${tx.payee ? esc(tx.payee) : "NULL"}, ${tx.memo ? esc(tx.memo) : "NULL"}, ${tx.mcc ? esc(tx.mcc) : "NULL"}, '${now}') ON CONFLICT(id) DO UPDATE SET amount = excluded.amount, description = excluded.description, date = excluded.date, posted_date = excluded.posted_date, payee = excluded.payee, memo = excluded.memo, updated_at = excluded.updated_at`;
  });
  executeBulk(stmts);
  return transactions.length;
}
