'use server';

import { unstable_cache, revalidateTag } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const MONTH_REGEX = /^\d{4}-\d{2}$/;


export interface DashboardInsight {
  id: string;
  severity: 'info' | 'warn' | 'critical';
  title: string;
  message: string;
  metric_value: number | null;
  delta_value: number | null;
  cta_label?: string | null;
  cta_route?: string | null;
}

export interface DashboardSummaryPayload {
  forecast: {
    spent_so_far: number;
    days_elapsed: number;
    days_in_month: number;
    daily_avg: number;
    projected_spent: number;
    projected_remaining_budget: number | null;
    projected_savings: number;
    confidence: 'low' | 'medium' | 'high';
  };
  spending_breakdown: {
    total_expenses: number;
    total_income: number;
    net: number;
    categories: Array<{ category_id: string; category_name: string; total: number; percentage: number }>;
    essentials_total: number;
    non_essentials_total: number;
    payment_mix: Array<{ payment_type: string; total: number; percentage: number }>;
    credit_cards_total: number;
    accounts_total: number;
  };
  insights: Array<{
    id: string;
    severity: 'info' | 'warn' | 'critical';
    title: string;
    message: string;
    metric_value: number | null;
    delta_value: number | null;
    cta_label?: string | null;
    cta_route?: string | null;
  }>;
  investment_goals: Array<{
    goal_id: string;
    name: string;
    target_amount: number;
    current_amount: number;
    contributed_this_month: number;
    remaining_amount: number;
    months_to_target: number | null;
    required_monthly_contribution: number | null;
    status: 'on_track' | 'behind' | 'ahead';
  }>;
  expenses_by_category: Array<{ category_id: string; name: string; total: number }>;
  invoices_summary: Array<{ card_id: string; card_name: string; current_invoice_total: number; next_invoice_total: number }>;
}

const normalizeMonthInput = (month: string) => (MONTH_REGEX.test(month) ? `${month}-01` : null);

const getDashboardSummaryCached = unstable_cache(
  async (userId: string, monthStart: string, nextMonthStart: string, today: string) => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('get_dashboard_summary', {
      p_user_id: userId,
      p_month_start: monthStart,
      p_next_month_start: nextMonthStart,
      p_today: today
    });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? {}) as DashboardSummaryPayload;
  },
  ['dashboard-summary-v2'],
  { revalidate: 45, tags: ['dashboard-summary'] }
);

export async function getDashboardData(month: string) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return { ok: false as const, error: 'Usuário não autenticado.' };

  const monthStart = normalizeMonthInput(month);
  if (!monthStart) return { ok: false as const, error: 'Mês inválido.' };

  const monthDate = new Date(`${monthStart}T00:00:00.000Z`);
  const nextMonthStart = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  await supabase.rpc('generate_pending_recurring_transactions', { p_user_id: user.id });

  try {
    const summary = await getDashboardSummaryCached(user.id, monthStart, nextMonthStart, today);
    return { ok: true as const, summary };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'Erro ao carregar dashboard.' };
  }
}

export async function invalidateDashboardCache() {
  revalidateTag('dashboard-summary');
}
