export interface SimpleFINAccount {
  id: string;
  name: string;
  currency: string;
  balance: string;
  "available-balance": string;
  "balance-date": number;
  transactions: SimpleFINTransaction[];
  holdings: unknown[];
  org: {
    domain: string;
    name: string;
    "sfin-url": string;
    url: string;
    id: string;
  };
}

export interface SimpleFINTransaction {
  id: string;
  amount: string;
  description: string;
  posted: number;
  transacted_at: number;
  payee?: string;
  memo?: string;
  mcc?: string | null;
  category?: string;
  "fit-id"?: string;
  pending?: boolean;
}

export interface D1Account {
  id: string;
  name: string;
  currency: string;
  balance: number;
  available_balance: number;
  balance_date: string;
  institution: string;
  org_domain: string;
  last_four: string | null;
}

export interface D1Transaction {
  id: string;
  account_id: string;
  amount: number;
  description: string;
  date: string;
  posted_date: string | null;
  payee: string | null;
  memo: string | null;
  mcc: string | null;
  updated_at: string;
}

export interface AccountBalance {
  account_id: string;
  account_name: string;
  balance: number;
  available_balance: number;
  currency: string;
  balance_date: string;
  institution: string;
}
