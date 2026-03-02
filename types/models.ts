export type EntryType = 'income' | 'expense';
export type PaymentMethod = 'credit' | 'debit' | 'pix' | 'cash';

export interface Account {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: EntryType;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string;
  amount: number;
  type: EntryType;
  payment_method?: PaymentMethod;
  description: string | null;
  date: string;
  created_at: string;
  category?: Pick<Category, 'name' | 'type'>;
  account?: Pick<Account, 'name'>;
}

export interface Goal {
  id: string;
  user_id: string;
  category_id: string;
  monthly_limit: number;
  month: string;
  created_at: string;
  category?: Pick<Category, 'name'>;
}
