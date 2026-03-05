'use server';

import { unstable_noStore as noStore } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export interface DashboardInsight {
  emoji: string;
  level: 'info' | 'warn';
  text: string;
}

export interface DashboardSummary {
  income_total: number;
  expense_total: number;
  expense_by_category: Record<string, number>;
  balance_total: number;
  cards: Array<{
    card_id: string;
    card_name: string;
    current_invoice_total: number;
    next_invoice_total: number;
    closing_date: string;
    due_date: string;
    limit_used: number;
    limit_available: number | null;
  }>;
  category_spend: Array<{ category_id: string; name: string; total: number }>;
  upcoming_payments: Array<{ label: string; due_date: string; amount: number; source_type: string }>;
  free_money_estimate: number;
  recent_transactions: Array<{
    id: string;
    date: string;
    title: string;
    amount: number;
    category: string;
    payment_method: string;
    card_name?: string;
    installment_index?: number;
    installment_total?: number;
  }>;
}

const MONTH_REGEX = /^\d{4}-\d{2}$/;

const normalizeMonthInput = (month: string) => {
  if (!MONTH_REGEX.test(month)) return null;
  return `${month}-01`;
};

const getExpenseByCategory = (categorySpend: DashboardSummary['category_spend']) => {
  return (categorySpend ?? []).reduce<Record<string, number>>((acc, row) => {
    const categoryId = String(row?.category_id ?? '').trim();
    if (!categoryId) return acc;
    const total = Number(row?.total ?? 0);
    acc[categoryId] = Number.isFinite(total) ? total : 0;
    return acc;
  }, {});
};

export async function getDashboardData(month: string) {
  noStore();
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, error: 'Usuário não autenticado.' };
  }

  const normalizedMonth = normalizeMonthInput(month);
  if (!normalizedMonth) {
    return { ok: false as const, error: 'Mês inválido.' };
  }

  const monthStart = new Date(`${normalizedMonth}T00:00:00.000Z`);
  const nextMonthStart = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1));
  const nextMonth = nextMonthStart.toISOString().slice(0, 10);

  await supabase.rpc('generate_pending_recurring_transactions', { p_user_id: user.id });

  const [summaryResult, insightsResult, goalsResult, expenseByCategoryResult] = await Promise.all([
    supabase.rpc('get_dashboard_summary', { p_user_id: user.id, p_month: normalizedMonth }),
    supabase.rpc('get_dashboard_insights', { p_user_id: user.id, p_month: normalizedMonth }),
    supabase
      .from('goals')
      .select('id,name,target_amount,current_amount,monthly_limit,month,type,deadline,category_id,category:categories(name)', { count: 'exact' })
      .gte('month', normalizedMonth)
      .lt('month', nextMonth)
      .order('created_at', { ascending: false }),
    supabase.rpc('get_expense_by_category', {
      p_user_id: user.id,
      p_month_start: normalizedMonth,
      p_next_month_start: nextMonth
    })
  ]);

  if (summaryResult.error) return { ok: false as const, error: summaryResult.error.message };
  if (insightsResult.error) return { ok: false as const, error: insightsResult.error.message };
  if (goalsResult.error) return { ok: false as const, error: goalsResult.error.message };
  if (expenseByCategoryResult.error) return { ok: false as const, error: expenseByCategoryResult.error.message };

  const summary = (summaryResult.data ?? {}) as DashboardSummary;
  const rpcExpenseByCategory = Array.isArray(expenseByCategoryResult.data)
    ? expenseByCategoryResult.data.reduce<Record<string, number>>((acc, row) => {
        const categoryId = String(row?.category_id ?? '').trim();
        if (!categoryId) return acc;
        const amount = Number(row?.amount ?? 0);
        acc[categoryId] = Number.isFinite(amount) ? amount : 0;
        return acc;
      }, {})
    : null;

  return {
    ok: true as const,
    summary: {
      ...summary,
      expense_total: Number(summary.expense_total ?? 0),
      expense_by_category: rpcExpenseByCategory ?? getExpenseByCategory(summary.category_spend)
    },
    insights: (insightsResult.data ?? []) as DashboardInsight[],
    goal: goalsResult.data?.[0] ?? null,
    goalCount: goalsResult.count ?? goalsResult.data?.length ?? 0
  };
}
