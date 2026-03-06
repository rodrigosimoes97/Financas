export type EntryType = 'income' | 'expense';
export type PaymentMethod = 'credit' | 'debit' | 'pix' | 'cash';
export type GoalType = 'SAVE' | 'SPEND_LIMIT' | 'INVESTMENT';

export interface Account {
  id: string;
  user_id: string;
  name: string;
  archived_at?: string | null;
  is_essential?: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: EntryType;
  is_essential?: boolean;
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
  parent_transaction_id?: string | null;
  credit_card_id?: string | null;
  installment_group_id?: string | null;
  is_installment?: boolean;
  installment_number?: number | null;
  total_installments?: number | null;
  installment_total?: number | null;
  installments_total?: number | null;
  installment_index?: number | null;
  category?: Pick<Category, 'name' | 'type'>;
  account?: Pick<Account, 'name'>;
  credit_card?: { name?: string };
}

export interface Goal {
  id: string;
  user_id: string;
  category_id: string | null;
  monthly_limit: number;
  target_amount: number;
  current_amount: number;
  name?: string | null;
  type: GoalType;
  deadline?: string | null;
  month: string;
  created_at: string;
  category?: Pick<Category, 'name'>;
}


export interface InvestmentGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  start_date: string;
  target_date?: string | null;
  monthly_contribution_target?: number | null;
  risk_profile?: 'conservative' | 'moderate' | 'aggressive' | null;
  created_at: string;
  updated_at: string;
}

export interface InvestmentContribution {
  id: string;
  user_id: string;
  goal_id: string;
  amount: number;
  date: string;
  source?: string | null;
  created_at: string;
}
